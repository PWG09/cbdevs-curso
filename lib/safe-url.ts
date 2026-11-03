/** Returns the URL only when it is a plain https URL without embedded credentials. */
export function safeExternalUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.length > 2048) return undefined;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\//i;

/** True for object paths in the private course bucket (`<organization uuid>/...`), as storage RLS requires. */
export function isStorageObjectPath(value: unknown): value is string {
  return typeof value === "string" && value.length <= 1024 && UUID_PREFIX.test(value) && !value.includes("..") && !value.startsWith("/");
}
