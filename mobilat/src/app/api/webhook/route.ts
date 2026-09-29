import type Stripe from "stripe";
import { PLANS, type PlanId } from "@/lib/config";
import { accountIdForCustomer, addCredits, claimEvent, linkCustomer, setAccountEmail } from "@/lib/credits";
import { getStore, type Store } from "@/lib/store";
import { getStripe } from "@/lib/stripe";

// Point a Stripe webhook at /api/webhook with these events:
// checkout.session.completed, checkout.session.async_payment_succeeded, invoice.paid
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
    await store.expire(`evt:${event.id}`, 1);
    console.error("webhook handling failed", event.type, err);
    return new Response("handler error", { status: 500 });
  }
  return Response.json({ received: true });
}

async function handleEvent(store: Store, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      // Delayed payment methods complete first as "unpaid", then send
      // async_payment_succeeded once the money arrives.
      if (session.payment_status !== "paid") return;
      const accountId = session.metadata?.accountId;
      const plan = PLANS[session.metadata?.plan as PlanId];
      if (!accountId || !plan) return;

      await addCredits(store, accountId, plan.credits);
      const email = session.customer_details?.email;
      if (email) await setAccountEmail(store, accountId, email);
      const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (customer) await linkCustomer(store, customer, accountId);
      return;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      // The first invoice is covered by checkout.session.completed.
      if (invoice.billing_reason !== "subscription_cycle") return;
      const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const accountId = customer ? await accountIdForCustomer(store, customer) : null;
      if (accountId) await addCredits(store, accountId, PLANS.pro.credits);
      return;
    }
  }
}
