import "server-only";
import type { NextRequest } from "next/server";
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}
