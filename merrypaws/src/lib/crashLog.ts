import type { Store } from "./store";

// What a phone may tell us about a crash, cleaned before it reaches the logs:
// cut to size, and with anything that could be an album key or an email
// address blanked out, since a stack can carry the page URL.

export type CrashRecord = { where: string; message: string; stack: string; digest?: string; page: string; ua: string };

const PER_IP_PER_HOUR = 20;

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export function scrub(text: string) {
  return text
    .replace(/([#?&](?:k|token|code)=)[^\s&#)"']+/gi, "$1…")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "…@…")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "…");
}

export function parseCrash(raw: string): CrashRecord | null {
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!input || typeof input !== "object") return null;
  const message = scrub(clip(input.message, 300)).trim();
  if (!message) return null;
  const where = clip(input.where, 24).replace(/[^\w-]/g, "") || "unknown";
  const digest = clip(input.digest, 32).replace(/[^\w-]/g, "") || undefined;
  return {
    where,
    message,
    // The top of the stack is where the bug is; the rest is framework.
    stack: scrub(clip(input.stack, 4000)).split("\n").slice(0, 12).join("\n").slice(0, 1500),
    digest,
    page: scrub(clip(input.page, 120)),
    ua: clip(input.ua, 200),
  };
}

// One broken phone in a render loop shouldn't fill the logs.
export async function underCrashLimit(store: Store, ip: string, now = new Date()) {
  const key = `crashlim:${ip}:${now.toISOString().slice(0, 13)}`;
  const count = await store.incrby(key, 1);
  if (count === 1) await store.expire(key, 3600);
  return count <= PER_IP_PER_HOUR;
}
