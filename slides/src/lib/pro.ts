import type { Store } from "./store";

// Pro is a flag with an expiry. Each paid month extends it; a cancelled
// subscription simply stops renewing and the flag runs out.
const PERIOD = 35 * 24 * 60 * 60;

export async function grantPro(store: Store, accountId: string) {
  await store.set(`pro:${accountId}`, "1", { ex: PERIOD });
}

export async function isPro(store: Store, accountId: string | null) {
  if (!accountId) return false;
  return (await store.get(`pro:${accountId}`)) !== null;
}
