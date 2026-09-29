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

export type FreeLimits = { perIp: number; global: number };

// Reserve one free generation for this IP. Returns false when the IP or the
// global daily budget is used up. Call releaseFreeTrial if generation fails.
export async function takeFreeTrial(store: Store, ip: string, limits: FreeLimits): Promise<boolean> {
  const ipKey = `free:${today()}:${hashToken(ip)}`;
  const globalKey = `free:${today()}:all`;

  const ipCount = await store.incrby(ipKey, 1);
  if (ipCount === 1) await store.expire(ipKey, 2 * DAY);
  if (ipCount > limits.perIp) {
    await store.incrby(ipKey, -1);
    return false;
  }

  const globalCount = await store.incrby(globalKey, 1);
  if (globalCount === 1) await store.expire(globalKey, 2 * DAY);
  if (globalCount > limits.global) {
    await store.incrby(globalKey, -1);
    await store.incrby(ipKey, -1);
    return false;
  }
  return true;
}

export async function releaseFreeTrial(store: Store, ip: string) {
  await store.incrby(`free:${today()}:${hashToken(ip)}`, -1);
  await store.incrby(`free:${today()}:all`, -1);
}

export async function freeTrialsLeft(store: Store, ip: string, limits: FreeLimits) {
  const used = Number((await store.get(`free:${today()}:${hashToken(ip)}`)) ?? 0);
  const globalUsed = Number((await store.get(`free:${today()}:all`)) ?? 0);
  if (globalUsed >= limits.global) return 0;
  return Math.max(0, limits.perIp - used);
}

// Buyers get a larger preview budget, counted per account instead of per IP.
export async function takeBuyerPreview(store: Store, accountId: string, perDay: number): Promise<boolean> {
  const key = `buyer:${today()}:${accountId}`;
  const count = await store.incrby(key, 1);
  if (count === 1) await store.expire(key, 2 * DAY);
  if (count > perDay) {
    await store.incrby(key, -1);
    return false;
  }
  return true;
}

export async function releaseBuyerPreview(store: Store, accountId: string) {
  await store.incrby(`buyer:${today()}:${accountId}`, -1);
}
