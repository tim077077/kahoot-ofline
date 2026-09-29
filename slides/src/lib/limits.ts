import { createHash } from "node:crypto";
import type { Store } from "./store";

// Daily caps on AI calls, so a leaked URL can't run up your Anthropic bill.

const DAY = 24 * 60 * 60;

const hashIp = (ip: string) => createHash("sha256").update(ip).digest("hex");

const today = () => new Date().toISOString().slice(0, 10);

export type AiLimits = { perIp: number; global: number };

// Reserve one AI call for this IP. Returns false when the IP or the
// global daily budget is used up. Call releaseAiCall if generation fails.
export async function takeAiCall(store: Store, ip: string, limits: AiLimits): Promise<boolean> {
  const ipKey = `free:${today()}:${hashIp(ip)}`;
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

export async function releaseAiCall(store: Store, ip: string) {
  await store.incrby(`free:${today()}:${hashIp(ip)}`, -1);
  await store.incrby(`free:${today()}:all`, -1);
}
