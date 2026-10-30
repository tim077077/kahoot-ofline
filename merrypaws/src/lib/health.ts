import { scrub } from "./crashLog";
import { normalizeEndpoint, type ObjectStore } from "./objects";
import type { Store } from "./store";

// What /api/health says about each service. Names of missing settings are
// fine to show; values never are.

const STORAGE = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];

export const missing = (names: string[], env: Record<string, string | undefined> = process.env) => names.filter((n) => !env[n]);

// What a wrong value resembles, without ever repeating it.
export function looksLike(raw: string) {
  const v = raw.trim();
  if (!v) return " (it's empty)";
  if (/^[0-9a-f]{64}$/i.test(v)) return " (it looks like a Secret Access Key)";
  if (/^[A-Za-z0-9_-]{40}$/.test(v)) return " (it looks like an API token)";
  if (/^[a-z0-9][a-z0-9-]{1,62}$/.test(v)) return " (it looks like a bucket name)";
  return "";
}

// The usual ways R2 setup goes wrong, said in words you can act on.
export function storageHint(err: unknown, endpoint = process.env.S3_ENDPOINT ?? "") {
  const text = String(err instanceof Error ? err.message : err);
  const status = Number(text.match(/\b(\d{3})\b/)?.[1]);
  try {
    const host = new URL(normalizeEndpoint(endpoint)).hostname;
    if (!host.endsWith(".r2.cloudflarestorage.com") && !host.includes(".")) throw new Error("not a host");
  } catch {
    return `S3_ENDPOINT isn't a web address${looksLike(endpoint)}. It should look like https://<account-id>.r2.cloudflarestorage.com`;
  }
  if (status === 401 || status === 403) return "R2 refused the key. S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must come from the same R2 token, with Object Read & Write on this bucket.";
  if (status === 404) return "Bucket not found. S3_BUCKET must be the bucket's exact name, and S3_ENDPOINT must use the same Cloudflare account.";
  if (status === 400) return "R2 rejected the request. Set S3_REGION to auto and check S3_ENDPOINT.";
  if (!status) return "Can't reach S3_ENDPOINT. Check the account id in it.";
  return `R2 answered ${status}.`;
}

// Write, read back and delete a tiny file: proves the bucket really works,
// not just that four settings exist.
export async function checkStorage(objects: () => ObjectStore): Promise<{ ok: boolean; hint?: string }> {
  const gaps = missing(STORAGE);
  if (gaps.length) return { ok: false, hint: `Missing: ${gaps.join(", ")}` };
  const key = "health/check.txt";
  const body = new TextEncoder().encode(new Date().toISOString());
  try {
    const store = objects();
    await store.put(key, body, "text/plain");
    const back = await store.get(key);
    await store.del(key);
    if (!back || back.length !== body.length) return { ok: false, hint: "R2 saved the test file but gave back something else." };
    return { ok: true };
  } catch (err) {
    return { ok: false, hint: storageHint(err) };
  }
}

// The last portrait that failed, and why, so /api/health can say what the
// image service answered without anyone digging through logs. Keys are
// blanked; a portrait that works clears it.
const PORTRAIT_FAILURE = "health:portraitFailure";

export async function recordPortraitFailure(store: Store, reason: string, now = new Date()) {
  const clean = scrub(reason.replace(/AIza[0-9A-Za-z_-]{20,}/g, "…")).replace(/\s+/g, " ").slice(0, 400);
  await store.set(PORTRAIT_FAILURE, JSON.stringify({ at: now.toISOString(), reason: clean }), { ex: 7 * 24 * 3600 }).catch(() => {});
}

export async function clearPortraitFailure(store: Store) {
  await store.del(PORTRAIT_FAILURE).catch(() => {});
}

export async function lastPortraitFailure(store: Store): Promise<{ at: string; reason: string } | null> {
  const raw = await store.get(PORTRAIT_FAILURE).catch(() => null);
  return raw ? (JSON.parse(raw) as { at: string; reason: string }) : null;
}
