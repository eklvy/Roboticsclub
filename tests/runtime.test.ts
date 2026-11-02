import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { withFileLock } from "../src/lib/server/file-lock";
import { readPreference, writePreference } from "../src/lib/browser-storage";
import { sound } from "../src/lib/sound";

test("blocked browser storage preserves in-memory preferences without breaking sound or navigation", () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      get localStorage() {
        throw new Error("Storage denied");
      },
    },
  });
  try {
    assert.equal(readPreference("audit-absent"), null);
    assert.doesNotThrow(() => writePreference("nexus-muted", "false"));
    assert.equal(readPreference("nexus-muted"), "false");
    assert.doesNotThrow(() => sound("click"));
  } finally {
    if (before) Object.defineProperty(globalThis, "window", before);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
test("independent local transactions cannot overwrite each other and release locks on errors", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-lock-test-")),
    lock = path.join(dir, "event.lock"),
    state = path.join(dir, "state.json");
  try {
    await fs.writeFile(state, "0");
    await Promise.all(
      Array.from({ length: 12 }, () =>
        withFileLock(lock, async () => {
          const n = Number(await fs.readFile(state, "utf8"));
          await new Promise((r) => setTimeout(r, 3));
          await fs.writeFile(state, String(n + 1));
        }),
      ),
    );
    assert.equal(await fs.readFile(state, "utf8"), "12");
    await assert.rejects(
      withFileLock(lock, async () => {
        throw new Error("deliberate test failure");
      }),
      /deliberate/,
    );
    assert.equal(await withFileLock(lock, async () => 42), 42);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("failed and timed-out requests provide actionable errors instead of leaving busy controls", async () => {
  const { clientFetch } = await import("../src/lib/client-fetch");
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new DOMException("timeout", "TimeoutError");
    };
    await assert.rejects(clientFetch("/api/game"), /too long to respond/);
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(
      clientFetch("/api/game"),
      /Cannot reach the game server/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
