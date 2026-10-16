import { PAID_TIERS, purchaseFor } from "@/lib/config";
import { memberOr401 } from "@/lib/http";
import { activatePlan, currentTier, GRACE_MS } from "@/lib/plans";

// "Restore purchases" in the apps: after the store SDK has re-attached this
// Apple ID's or Google account's purchases to the album, ask RevenueCat what
// is active and switch on the best plan. Also catches a missed webhook.
//
// Needs REVENUECAT_SECRET_KEY (RevenueCat → Project settings → API keys →
// a secret v1 key). Only turns plans on; ending them stays with the webhook.

type RcSubscription = {
  expires_date?: string | null;
  refunded_at?: string | null;
  is_sandbox?: boolean;
  store?: string;
  product_plan_identifier?: string | null;
};

export async function POST(request: Request) {
  const member = await memberOr401(request);
  if (member instanceof Response) return member;
  const { store, accountId } = member;

  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) return Response.json({ error: "restore_off" }, { status: 503 });

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(accountId)}`, {
    headers: { authorization: `Bearer ${key}`, accept: "application/json" },
  });
  if (!res.ok) {
    console.error("revenuecat restore failed", res.status, await res.text().catch(() => ""));
    return Response.json({ error: "store_unavailable" }, { status: 502 });
  }
  const body = (await res.json()) as { subscriber?: { subscriptions?: Record<string, RcSubscription> } };
  const now = Date.now();
  const allowSandbox = process.env.REVENUECAT_SANDBOX === "allow";

  const active = Object.entries(body.subscriber?.subscriptions ?? {}).flatMap(([id, sub]) => {
    // Google Play reports the subscription and its base plan separately.
    const full = sub.product_plan_identifier && !id.includes(":") ? `${id}:${sub.product_plan_identifier}` : id;
    const purchase = purchaseFor(full);
    const until = sub.expires_date ? Date.parse(sub.expires_date) : NaN;
    if (purchase?.kind !== "plan" || !(until > now) || sub.refunded_at || (sub.is_sandbox && !allowSandbox)) return [];
    return [{ ...purchase, until }];
  });

  // The best tier wins, as in PAID_TIERS order.
  active.sort((a, b) => PAID_TIERS.indexOf(a.tier) - PAID_TIERS.indexOf(b.tier));
  const best = active[0];
  if (best) await activatePlan(store, accountId, { tier: best.tier, interval: best.interval, until: best.until + GRACE_MS });

  return Response.json({ restored: Boolean(best), tier: await currentTier(store, accountId) });
}
