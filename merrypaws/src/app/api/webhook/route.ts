import type Stripe from "stripe";
import { PLANS, type PlanId } from "@/lib/config";
import { addCredits, claimEvent, setAccountEmail } from "@/lib/credits";
import { track } from "@/lib/events";
import { unlockWithCredit } from "@/lib/portraits";
import { getStore, type Store } from "@/lib/store";
import { getStripe } from "@/lib/stripe";

// Point a Stripe webhook at /api/webhook with these events:
// checkout.session.completed, checkout.session.async_payment_succeeded
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

async function handleEvent(store: Store, event: Stripe.Event) {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return;

  const session = event.data.object;
  // Delayed payment methods complete first as "unpaid", then send
  // async_payment_succeeded once the money arrives.
  if (session.payment_status !== "paid") return;
  const accountId = session.metadata?.accountId;
  const plan = PLANS[session.metadata?.plan as PlanId];
  if (!accountId || !plan) return;

  await addCredits(store, accountId, plan.credits);
  await track(store, "purchase");
  const email = session.customer_details?.email;
  if (email) await setAccountEmail(store, accountId, email);

  const unlockId = session.metadata?.unlockId;
  if (unlockId) await unlockWithCredit(store, unlockId, accountId);
}
