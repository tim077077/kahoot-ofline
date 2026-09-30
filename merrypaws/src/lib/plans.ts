import { PREVIEWS_PER_CREDIT, TIERS, type Interval, type Tier } from "./config";
import type { Store } from "./store";

// Membership state and portrait allowances.
//
// A plan is active until `until`. Stripe (web) or RevenueCat (app stores)
// extends it on every renewal; if a renewal fails the plan simply lapses a few
// days after the period ends. Monthly allowances refill lazily: the first
// request in each 30-day cycle claims that cycle's refill exactly once, which
// works the same for monthly and yearly billing.

const DAY_MS = 24 * 60 * 60 * 1000;
const CYCLE_MS = 30 * DAY_MS;
// Renewal webhooks can arrive a little late; don't drop members meanwhile.
export const GRACE_MS = 3 * DAY_MS;

export type PlanState = { tier: Tier; interval: Interval; start: number; until: number; subscriptionId?: string };

export async function getPlan(store: Store, accountId: string): Promise<PlanState | null> {
  const raw = await store.get(`plan:${accountId}`);
  return raw ? (JSON.parse(raw) as PlanState) : null;
}

export async function currentTier(store: Store, accountId: string | null, now = Date.now()): Promise<Tier> {
  if (!accountId) return "free";
  const plan = await getPlan(store, accountId);
  return plan && plan.until > now ? plan.tier : "free";
}

// Start or extend a plan. Keeps the original start so refill cycles stay put.
export async function activatePlan(
  store: Store,
  accountId: string,
  update: { tier: Tier; interval: Interval; until: number; subscriptionId?: string },
  now = Date.now(),
) {
  const existing = await getPlan(store, accountId);
  const sameRun = existing && existing.until > now && existing.tier === update.tier;
  const plan: PlanState = {
    tier: update.tier,
    interval: update.interval,
    start: sameRun ? existing.start : now,
    until: Math.max(update.until, sameRun ? existing.until : 0),
    subscriptionId: update.subscriptionId ?? existing?.subscriptionId,
  };
  await store.set(`plan:${accountId}`, JSON.stringify(plan));
  return plan;
}

export async function endPlan(store: Store, accountId: string, now = Date.now()) {
  const existing = await getPlan(store, accountId);
  if (!existing) return;
  await store.set(`plan:${accountId}`, JSON.stringify({ ...existing, until: Math.min(existing.until, now) }));
}

// Refill this cycle's previews and HD credits, once per cycle.
export async function refreshAllowance(store: Store, accountId: string, now = Date.now()) {
  const plan = await getPlan(store, accountId);
  if (!plan || plan.until <= now) return false;
  const info = TIERS[plan.tier];
  const cycle = Math.floor((now - plan.start) / CYCLE_MS);
  const claimed = await store.set(`refill:${accountId}:${plan.start}:${cycle}`, "1", { ex: 40 * 24 * 60 * 60, nx: true });
  if (!claimed) return false;
  await store.set(`subprev:${accountId}`, String(info.previewsPerMonth), { ex: 31 * 24 * 60 * 60 });
  if (info.hdPerMonth > 0) await store.incrby(`credits:${accountId}`, info.hdPerMonth);
  return true;
}

// Previews bought with credit packs.
export async function addPackPreviews(store: Store, accountId: string, credits: number) {
  await store.incrby(`previews:${accountId}`, credits * PREVIEWS_PER_CREDIT);
}

export type PreviewSource = "plan" | "pack";

// Take one preview: the plan's monthly allowance first, then pack previews.
// Returns where it came from so a failed generation can give it back.
export async function takePreview(store: Store, accountId: string): Promise<PreviewSource | null> {
  for (const [source, key] of [
    ["plan", `subprev:${accountId}`],
    ["pack", `previews:${accountId}`],
  ] as const) {
    if (Number((await store.get(key)) ?? 0) <= 0) continue;
    const left = await store.incrby(key, -1);
    if (left >= 0) return source;
    await store.incrby(key, 1);
  }
  return null;
}

export async function releasePreview(store: Store, accountId: string, source: PreviewSource) {
  await store.incrby(source === "plan" ? `subprev:${accountId}` : `previews:${accountId}`, 1);
}

export async function previewsLeft(store: Store, accountId: string) {
  const plan = Number((await store.get(`subprev:${accountId}`)) ?? 0);
  const pack = Number((await store.get(`previews:${accountId}`)) ?? 0);
  return Math.max(0, plan) + Math.max(0, pack);
}
