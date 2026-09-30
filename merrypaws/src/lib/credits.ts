import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Store } from "./store";

// Accounts have no password: the browser holds a random access token (also
// shown to the buyer as a bookmarkable link). The server stores only its hash.

const DAY = 24 * 60 * 60;

export type Account = { id: string; email?: string; createdAt: string };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createAccount(store: Store): Promise<{ account: Account; token: string }> {
  const account: Account = { id: randomUUID(), createdAt: new Date().toISOString() };
  const token = randomBytes(24).toString("base64url");
  await store.set(`acct:${account.id}`, JSON.stringify(account));
  await store.set(`tok:${hashToken(token)}`, account.id);
  return { account, token };
}

export async function accountIdForToken(store: Store, token: string | null | undefined) {
  if (!token || token.length < 16 || token.length > 128) return null;
  return store.get(`tok:${hashToken(token)}`);
}

export async function setAccountEmail(store: Store, accountId: string, email: string) {
  const raw = await store.get(`acct:${accountId}`);
  if (!raw) return;
  const account = JSON.parse(raw) as Account;
  await store.set(`acct:${accountId}`, JSON.stringify({ ...account, email }));
}

export async function getCredits(store: Store, accountId: string) {
  return Number((await store.get(`credits:${accountId}`)) ?? 0);
}

export async function addCredits(store: Store, accountId: string, amount: number) {
  return store.incrby(`credits:${accountId}`, amount);
}

// Atomic take: decrement first, undo if that went below zero. Two parallel
// requests can never both spend the last credit.
export async function takeCredit(store: Store, accountId: string): Promise<boolean> {
  const left = await store.incrby(`credits:${accountId}`, -1);
  if (left < 0) {
    await store.incrby(`credits:${accountId}`, 1);
    return false;
  }
  return true;
}

export async function refundCredit(store: Store, accountId: string) {
  await store.incrby(`credits:${accountId}`, 1);
}

// Stripe retries webhooks; this makes sure each event grants credits once.
export async function claimEvent(store: Store, eventId: string) {
  return store.set(`evt:${eventId}`, "1", { ex: 30 * DAY, nx: true });
}

const today = () => new Date().toISOString().slice(0, 10);

export type FreeLimits = { perDevice: number; perIp: number; global: number };
export type Guest = { device: string; ip: string };

// Count one use against a key; undo and refuse when that goes over the limit.
async function reserve(store: Store, key: string, limit: number, ttl: number): Promise<boolean> {
  const count = await store.incrby(key, 1);
  if (count === 1) await store.expire(key, ttl);
  if (count > limit) {
    await store.incrby(key, -1);
    return false;
  }
  return true;
}

const freeKeys = (guest: Guest) => ({
  // A device keeps its free portrait count for a year; IP and global are daily.
  device: `free:dev:${hashToken(guest.device)}`,
  ip: `free:${today()}:${hashToken(guest.ip)}`,
  global: `free:${today()}:all`,
});

// Reserve one free generation for this guest. Returns false when the device,
// the IP or the global daily budget is used up. Call releaseFreeTrial if
// generation fails, so a failed portrait never costs the guest their trial.
export async function takeFreeTrial(store: Store, guest: Guest, limits: FreeLimits): Promise<boolean> {
  const keys = freeKeys(guest);
  if (!(await reserve(store, keys.device, limits.perDevice, 365 * DAY))) return false;
  if (!(await reserve(store, keys.ip, limits.perIp, 2 * DAY))) {
    await store.incrby(keys.device, -1);
    return false;
  }
  if (!(await reserve(store, keys.global, limits.global, 2 * DAY))) {
    await store.incrby(keys.device, -1);
    await store.incrby(keys.ip, -1);
    return false;
  }
  return true;
}

export async function releaseFreeTrial(store: Store, guest: Guest) {
  const keys = freeKeys(guest);
  await store.incrby(keys.device, -1);
  await store.incrby(keys.ip, -1);
  await store.incrby(keys.global, -1);
}

export async function freeTrialsLeft(store: Store, guest: Guest, limits: FreeLimits) {
  const keys = freeKeys(guest);
  const used = async (key: string) => Number((await store.get(key)) ?? 0);
  if ((await used(keys.global)) >= limits.global) return 0;
  return Math.max(0, Math.min(limits.perDevice - (await used(keys.device)), limits.perIp - (await used(keys.ip))));
}

// A per-minute cap on previews for accounts, so a script can't burn through
// an allowance at once.
export async function takeMinuteSlot(store: Store, accountId: string, perMinute: number): Promise<boolean> {
  return reserve(store, `rate:${Math.floor(Date.now() / 60000)}:${accountId}`, perMinute, 120);
}

// In-app account deletion (required by the App Store): the token stops
// working and unspent tickets are gone.
export async function deleteAccount(store: Store, token: string) {
  const accountId = await accountIdForToken(store, token);
  if (!accountId) return false;
  await store.del(`tok:${hashToken(token)}`);
  await store.del(`credits:${accountId}`);
  await store.del(`acct:${accountId}`);
  return true;
}
