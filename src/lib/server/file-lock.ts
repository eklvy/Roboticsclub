import { promises as fs } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

// A local event may be reached by independently bundled game/admin routes.
// An exclusive file coordinates their read-modify-write transactions.
export async function withFileLock<T>(
  file: string,
  work: () => Promise<T>,
): Promise<T> {
  const deadline = Date.now() + 5000;
  let handle;
  while (!handle) {
    try {
      handle = await fs.open(file, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() >= deadline)
        throw new Error(
          "Event storage is busy. Retry in a moment. If a server crashed, stop all game servers and remove .data/event.lock before restarting.",
        );
      await delay(25);
    }
  }
  try {
    return await work();
  } finally {
    await handle.close();
    await fs.unlink(file);
  }
}
