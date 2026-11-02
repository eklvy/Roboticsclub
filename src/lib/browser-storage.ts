// Storage is optional: privacy modes and embedded browsers may deny access.
const fallback = new Map<string, string>();
export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? fallback.get(key) ?? null;
  } catch {
    return fallback.get(key) ?? null;
  }
}
export function writePreference(key: string, value: string): void {
  fallback.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the preference in memory for this tab; gameplay uses server cookies.
  }
}
