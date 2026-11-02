// Prevent a lost connection from leaving registration or a puzzle busy forever.
export async function clientFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  try {
    return await fetch(input, {
      ...init,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new Error(
        "The server took too long to respond. Reconnect and resume your mission before retrying.",
      );
    }
    throw new Error(
      "Cannot reach the game server. Check your connection and try again.",
    );
  }
}
