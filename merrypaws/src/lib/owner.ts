import { timingSafeEqual } from "node:crypto";
import type { Store } from "./store";

// The app's owner, for testing on a real phone: portraits without limits, HD
// without paws, the biggest album. Turned on once per album by opening
// https://<site>/#owner=<OWNER_CODE>. Nothing else changes, and each portrait
// still costs the Google bill, so the per-minute limit stays.

export const OWNER_SHOWN = 999;
const TRIES_PER_IP_PER_HOUR = 10;

export async function isOwner(store: Store, accountId: string | null) {
  return Boolean(accountId) && (await store.get(`owner:${accountId}`)) === "1";
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
