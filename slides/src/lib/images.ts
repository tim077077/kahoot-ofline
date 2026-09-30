import type { Screenshot } from "./analyze";

// Downloads an image for Claude to read, but only from an allowed CDN, only
// JPEG/PNG/WebP, and only up to 4 MB. The allow-list keeps a URL from an API
// response from pointing the server at anything else (internal addresses).

const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 8000;

export function isAllowedHost(raw: string, hostSuffixes: string[]) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && hostSuffixes.some((s) => url.hostname.endsWith(s));
  } catch {
    return false;
  }
}

export function fetchWithTimeout(url: string) {
  return fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
}

export async function fetchImage(url: string, hostSuffixes: string[]): Promise<Screenshot | undefined> {
  if (!isAllowedHost(url, hostSuffixes)) return undefined;
  const res = await fetchWithTimeout(url).catch(() => null);
  if (!res?.ok) return undefined;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const mediaType = (["image/jpeg", "image/png", "image/webp"] as const).find((t) => t === type);
  if (!mediaType) return undefined;
  const bytes = Buffer.from(await res.arrayBuffer().catch(() => new ArrayBuffer(0)));
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return undefined;
  return { data: bytes.toString("base64"), mediaType };
}
