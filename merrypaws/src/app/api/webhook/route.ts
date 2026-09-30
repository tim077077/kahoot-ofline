import type Stripe from "stripe";
import { PACKS, PAID_TIERS, type Interval, type PackId, type Tier } from "@/lib/config";
import { addCredits, claimEvent, setAccountEmail } from "@/lib/credits";
import { track } from "@/lib/events";
import { activatePlan, addPackPreviews, endPlan, GRACE_MS } from "@/lib/plans";
import { unlockWithCredit } from "@/lib/portraits";
import { getStore, type Store } from "@/lib/store";
import { getStripe } from "@/lib/stripe";

// Point a Stripe webhook at /api/webhook with these events:
// checkout.session.completed, checkout.session.async_payment_succeeded,
// invoice.paid, customer.subscription.deleted
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("webhook not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("bad signature", { status: 400 });
  }

  const store = getStore();
  if (!(await claimEvent(store, event.id))) return Response.json({ received: true, duplicate: true });

  try {
    await handleEvent(store, event);
  } catch (err) {
    // Let Stripe's retry reprocess this event.
    await store.del(`evt:${event.id}`);
    console.error("webhook handling failed", event.type, err);
    return new Response("handler error", { status: 500 });
  }
  return Response.json({ received: true });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function planFrom(metadata: Stripe.Metadata | null | undefined) {
  const accountId = metadata?.accountId;
  const tier = metadata?.tier as Tier;
  const interval: Interval = metadata?.interval === "year" ? "year" : "month";
  return accountId && PAID_TIERS.includes(tier) ? { accountId, tier, interval } : null;
}

async function handleEvent(store: Store, event: Stripe.Event) {
  if (event.type === "invoice.paid") {
    // Every renewal extends the plan to the end of the period just paid for.
    const invoice = event.data.object;
    const details = invoice.parent?.subscription_details;
    const plan = planFrom(details?.metadata);
    const periodEnd = invoice.lines.data[0]?.period?.end;
    if (!plan || !periodEnd) return;
    const subscriptionId = typeof details?.subscription === "string" ? details.subscription : details?.subscription?.id;
    await activatePlan(store, plan.accountId, { ...plan, until: periodEnd * 1000 + GRACE_MS, subscriptionId });
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const plan = planFrom(event.data.object.metadata);
    if (plan) await endPlan(store, plan.accountId);
    return;
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return;
  const session = event.data.object;
  const accountId = session.metadata?.accountId;
  if (!accountId) return;
  const email = session.customer_details?.email;

  if (session.mode === "subscription") {
    // Start the plan right away; invoice.paid sets the exact period end.
    const plan = planFrom(session.metadata);
    if (!plan || (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")) return;
    const length = plan.interval === "year" ? 366 * DAY_MS : 31 * DAY_MS;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    await activatePlan(store, accountId, { ...plan, until: Date.now() + length + GRACE_MS, subscriptionId });
    await track(store, "purchase");
    if (email) await setAccountEmail(store, accountId, email);
    return;
  }

  // Credit packs. Delayed payment methods complete first as "unpaid", then
  // send async_payment_succeeded once the money arrives.
  if (session.payment_status !== "paid") return;
  const pack = PACKS[session.metadata?.pack as PackId];
  if (!pack) return;
  await addCredits(store, accountId, pack.credits);
  await addPackPreviews(store, accountId, pack.credits);
  await track(store, "purchase");
  if (email) await setAccountEmail(store, accountId, email);

  const unlockId = session.metadata?.unlockId;
  if (unlockId) await unlockWithCredit(store, unlockId, accountId);
}
