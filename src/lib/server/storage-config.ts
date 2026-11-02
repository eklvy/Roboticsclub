export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigurationError";
  }
}

export function validateStorageEnvironment(
  env: Record<string, string | undefined> = process.env,
  cwd = process.cwd(),
): "supabase" | "local" {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && key) {
    try {
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol)) throw new Error();
    } catch {
      throw new StorageConfigurationError(
        "NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP(S) project URL.",
      );
    }
    return "supabase";
  }
  const serverless =
    env.VERCEL === "1" ||
    !!env.AWS_LAMBDA_FUNCTION_NAME ||
    !!env.LAMBDA_TASK_ROOT ||
    cwd === "/var/task" ||
    cwd.startsWith("/var/task/");
  if (serverless) {
    throw new StorageConfigurationError(
      "Hosted storage is not configured. This serverless deployment cannot persist local .data files. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in your hosting project's environment settings, apply supabase/migrations/001_event.sql, then redeploy.",
    );
  }
  if (url || key || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    throw new StorageConfigurationError(
      "Incomplete Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or clear all Supabase values for local practice.",
    );
  }
  return "local";
}
