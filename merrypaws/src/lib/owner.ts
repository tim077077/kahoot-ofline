import { timingSafeEqual } from "node:crypto";
import type { Store } from "./store";

// The app's owner, for testing on a real phone: portraits without limits, HD
// without paws, the biggest album. Turned on once per album by opening
// https://<site>/#owner=<OWNER_CODE>. Nothing else changes, and each portrait
// still costs the Google bill, so the per-minute limit stays.

export const OWNER_SHOWN = 999;
const TRIES_PER_IP_PER_HOUR = 10;

// While testing, FREE_FOR_TESTING=1 (a plain var in wrangler.jsonc) gives
// every album owner mode, with a daily cap on portraits for the whole site so
// an open link can't run up the Google bill.
export const freeForTesting = () => process.env.FREE_FOR_TESTING === "1";
export const TESTING_PORTRAITS_PER_DAY = 60;

export async function underTestingCap(store: Store, now = new Date()) {
  const key = `freetest:${now.toISOString().slice(0, 10)}`;
  const count = await store.incrby(key, 1);
  if (count === 1) await store.expire(key, 2 * 24 * 3600);
  if (count <= TESTING_PORTRAITS_PER_DAY) return true;
  await store.incrby(key, -1);
  return false;
}

export async function releaseTestingCap(store: Store, now = new Date()) {
  await store.incrby(`freetest:${now.toISOString().slice(0, 10)}`, -1);
}

export async function isOwner(store: Store, accountId: string | null) {
  if (!accountId) return false;
  return freeForTesting() || (await store.get(`owner:${accountId}`)) === "1";
}

export type ClaimResult = "owner" | "wrong" | "off" | "slow_down";

export async function claimOwner(store: Store, accountId: string, code: unknown, ip: string, now = new Date()): Promise<ClaimResult> {
  const secret = process.env.OWNER_CODE?.trim() ?? "";
  // A short code could be guessed; without one the feature is simply off.
  if (secret.length < 12) return "off";
  const tries = `ownertry:${ip}:${now.toISOString().slice(0, 13)}`;
  const count = await store.incrby(tries, 1);
  if (count === 1) await store.expire(tries, 3600);
  if (count > TRIES_PER_IP_PER_HOUR) return "slow_down";
  const given = Buffer.from(typeof code === "string" ? code.trim() : "");
  const want = Buffer.from(secret);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return "wrong";
  await store.set(`owner:${accountId}`, "1");
  return "owner";
}
