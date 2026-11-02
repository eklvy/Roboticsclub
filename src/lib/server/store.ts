import "server-only";
import { validateStorageEnvironment } from "./storage-config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Store } from "../types";
import { freshStore } from "./engine";
import { withFileLock } from "./file-lock";
export const production = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);
export function database() {
  if (!production) throw new Error("Supabase is not configured.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
const directory = path.join(process.cwd(), ".data"),
  file = path.join(directory, "event.json");
async function read(): Promise<Store> {
  validateStorageEnvironment();
  if (production) {
    const { data, error } = await database()
      .from("event_state")
      .select("data,version")
      .eq("id", 1)
      .single();
    if (error)
      throw new Error(
        "Event database unavailable. Apply the migration and verify credentials.",
      );
    return { ...data.data, version: data.version };
  }
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return freshStore();
    throw e;
  }
}
let queue = Promise.resolve();
export function transact<T>(
  fn: (store: Store) => T | Promise<T>,
  write = true,
): Promise<T> {
  const execute = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const store = await read();
      const version = store.version;
      const result = await fn(store);
      if (!write) return result;
      store.version++;
      if (production) {
        const db = database();
        const { data, error } = await db
          .from("event_state")
          .update({ data: store, version: store.version })
          .eq("id", 1)
          .eq("version", version)
          .select("version");
        if (error) throw new Error("Unable to save mission state.");
        if (!data.length) continue;
        // Publish only safe standings, never private session data.
        const { error: signalError } = await db
          .from("leaderboard_signal")
          .update({ version: store.version })
          .eq("id", 1);
        if (signalError)
          console.error(
            "Leaderboard realtime notification failed:",
            signalError.code,
          );
      } else {
        await fs.mkdir(directory, { recursive: true, mode: 0o700 });
        await fs.writeFile(file + ".tmp", JSON.stringify(store), {
          encoding: "utf8",
          mode: 0o600,
        });
        await fs.rename(file + ".tmp", file);
      }
      return result;
    }
    throw new Error("Event is busy. Retry your action.");
  };
  const task = queue.then(async () => {
    // Validate before any mkdir/lock: serverless storage must never fall back to disk.
    validateStorageEnvironment();
    if (production || !write) return execute();
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    return withFileLock(path.join(directory, "event.lock"), execute);
  });
  queue = task.then(
    () => {},
    () => {},
  );
  return task;
}
