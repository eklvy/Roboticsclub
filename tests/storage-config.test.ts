import test from "node:test";
import assert from "node:assert/strict";
import {
  validateStorageEnvironment,
  StorageConfigurationError,
} from "../src/lib/server/storage-config";

test("local practice remains available for a writable Node host", () => {
  assert.equal(validateStorageEnvironment({}, "/workspace/game"), "local");
  assert.equal(
    validateStorageEnvironment({ NODE_ENV: "production" }, "/srv/game"),
    "local",
  );
});
test("serverless runtimes reject missing storage before filesystem access", () => {
  for (const env of [
    { VERCEL: "1" },
    { AWS_LAMBDA_FUNCTION_NAME: "game" },
    { LAMBDA_TASK_ROOT: "/var/task" },
  ]) {
    assert.throws(
      () => validateStorageEnvironment(env, "/app"),
      StorageConfigurationError,
    );
  }
  assert.throws(
    () => validateStorageEnvironment({}, "/var/task"),
    /Hosted storage is not configured/,
  );
  assert.throws(
    () => validateStorageEnvironment({}, "/var/task/app"),
    /redeploy/,
  );
});
test("configured hosted storage uses Supabase and never local disk", () => {
  assert.equal(
    validateStorageEnvironment(
      {
        VERCEL: "1",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-server-key",
      },
      "/var/task",
    ),
    "supabase",
  );
});
test("partial or invalid configuration fails explicitly", () => {
  assert.throws(
    () =>
      validateStorageEnvironment(
        { NEXT_PUBLIC_SUPABASE_ANON_KEY: "test" },
        "/workspace",
      ),
    /Incomplete/,
  );
  assert.throws(
    () =>
      validateStorageEnvironment(
        {
          NEXT_PUBLIC_SUPABASE_URL: "invalid",
          SUPABASE_SERVICE_ROLE_KEY: "test",
        },
        "/workspace",
      ),
    /valid HTTP/,
  );
});
