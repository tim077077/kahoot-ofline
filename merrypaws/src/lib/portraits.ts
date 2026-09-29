import { randomUUID } from "node:crypto";
import { LIMITS } from "./config";
import { takeCredit } from "./credits";
import type { StyleId } from "./styles";
import type { Store } from "./store";

export type Portrait = { id: string; fullUrl: string; style: StyleId; createdAt: string };

const TTL = LIMITS.portraitTtlDays * 24 * 60 * 60;

export async function savePortrait(store: Store, fullUrl: string, style: StyleId): Promise<Portrait> {
  const portrait: Portrait = { id: randomUUID(), fullUrl, style, createdAt: new Date().toISOString() };
  await store.set(`portrait:${portrait.id}`, JSON.stringify(portrait), { ex: TTL });
  return portrait;
}

export async function getPortrait(store: Store, id: string): Promise<Portrait | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const raw = await store.get(`portrait:${id}`);
  return raw ? (JSON.parse(raw) as Portrait) : null;
}

export async function isUnlocked(store: Store, id: string) {
  return (await store.get(`unlocked:${id}`)) !== null;
}

export type UnlockResult = "unlocked" | "already" | "no_credits" | "missing";

// Spend one credit to unlock a portrait. The NX flag makes double clicks and
// webhook retries unlock (and charge) only once.
export async function unlockWithCredit(store: Store, id: string, accountId: string): Promise<UnlockResult> {
  if (!(await getPortrait(store, id))) return "missing";
  if (!(await store.set(`unlocked:${id}`, accountId, { ex: TTL, nx: true }))) return "already";
  if (!(await takeCredit(store, accountId))) {
    await store.del(`unlocked:${id}`);
    return "no_credits";
  }
  return "unlocked";
}
