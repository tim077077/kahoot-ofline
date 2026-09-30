import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { Store } from "./store";

// Email backup for the passwordless account. The phone still holds the token;
// a verified email is how an album survives a lost phone or a cleared browser.
//
// Codes, not links: a link opened from the mail app lands in a different
// browser than the home-screen app, so a 6-digit code typed into the app is
// the only flow that works everywhere.

const MINUTE = 60;
const CODE_TTL = 15 * MINUTE;
const MAX_TRIES = 5;

export type CodePurpose = "backup" | "signin";
type Pending = { hash: string; purpose: CodePurpose; accountId: string; tries: number };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const hashToken = sha;

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

export async function accountForEmail(store: Store, email: string) {
  return store.get(`email:${sha(email)}`);
}

export async function backupEmail(store: Store, accountId: string) {
  return store.get(`backup:${accountId}`);
}

// Tokens are per device. Every account keeps a list, so deleting the account
// signs out every phone.
export async function issueToken(store: Store, accountId: string) {
  const token = randomBytes(24).toString("base64url");
  await store.set(`tok:${sha(token)}`, accountId);
  await store.hset(`toks:${accountId}`, sha(token), new Date().toISOString());
  return token;
}

// Count one request against a key; refuse once over the limit.
async function underLimit(store: Store, key: string, limit: number, ttl: number) {
  const n = await store.incrby(key, 1);
  if (n === 1) await store.expire(key, ttl);
  return n <= limit;
}

export type CodeRequest =
  | { ok: true; code: string | null }
  | { ok: false; error: "slow_down" | "email_in_use" };

// Make a code for this email. For sign-in, an email with no album gets no code
// (and the caller answers the same way either way, so emails can't be probed).
export async function requestCode(
  store: Store,
  input: { email: string; purpose: CodePurpose; accountId: string | null; ip: string },
): Promise<CodeRequest> {
  const emailKey = sha(input.email);
  if (!(await underLimit(store, `otprate:${emailKey}`, 3, 15 * MINUTE))) return { ok: false, error: "slow_down" };
  if (!(await underLimit(store, `otpip:${sha(input.ip)}`, 10, 60 * MINUTE))) return { ok: false, error: "slow_down" };

  let accountId: string | null;
  if (input.purpose === "backup") {
    accountId = input.accountId;
    const owner = await accountForEmail(store, input.email);
    if (owner && owner !== accountId) return { ok: false, error: "email_in_use" };
  } else {
    accountId = await accountForEmail(store, input.email);
  }
  if (!accountId) return { ok: true, code: null };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const pending: Pending = { hash: sha(`${emailKey}:${code}`), purpose: input.purpose, accountId, tries: 0 };
  await store.set(`otp:${emailKey}`, JSON.stringify(pending), { ex: CODE_TTL });
  return { ok: true, code };
}

export type VerifyResult =
  | { ok: true; purpose: CodePurpose; accountId: string }
  | { ok: false; error: "wrong_code" | "expired" };

// Check a code. Five wrong tries and it's gone; a right one works once.
export async function verifyCode(store: Store, email: string, code: string): Promise<VerifyResult> {
  const emailKey = sha(email);
  const raw = await store.get(`otp:${emailKey}`);
  if (!raw) return { ok: false, error: "expired" };
  const pending = JSON.parse(raw) as Pending;
  const given = Buffer.from(sha(`${emailKey}:${String(code).trim()}`));
  if (!timingSafeEqual(given, Buffer.from(pending.hash))) {
    if (pending.tries + 1 >= MAX_TRIES) await store.del(`otp:${emailKey}`);
    else await store.set(`otp:${emailKey}`, JSON.stringify({ ...pending, tries: pending.tries + 1 }), { ex: CODE_TTL });
    return { ok: false, error: "wrong_code" };
  }
  await store.del(`otp:${emailKey}`);
  return { ok: true, purpose: pending.purpose, accountId: pending.accountId };
}

// Attach a verified email to an account (replacing any earlier one). Returns
// false if another album took the email in the meantime.
export async function linkEmail(store: Store, accountId: string, email: string) {
  const claimed = await store.set(`email:${sha(email)}`, accountId, { nx: true });
  if (!claimed && (await accountForEmail(store, email)) !== accountId) return false;
  const previous = await backupEmail(store, accountId);
  if (previous && previous !== email) await store.del(`email:${sha(previous)}`);
  await store.set(`backup:${accountId}`, email);
  return true;
}

// Part of "Delete my data": every device's token and the email go too.
export async function deleteAuth(store: Store, accountId: string) {
  const tokens = await store.hgetall(`toks:${accountId}`);
  for (const hash of Object.keys(tokens)) await store.del(`tok:${hash}`);
  await store.del(`toks:${accountId}`);
  const email = await backupEmail(store, accountId);
  if (email) await store.del(`email:${sha(email)}`);
  await store.del(`backup:${accountId}`);
}
