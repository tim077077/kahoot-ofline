import type Stripe from "stripe";
import { accountIdForCustomer, claimEvent, linkCustomer, setAccountEmail } from "@/lib/credits";
import { grantPro } from "@/lib/pro";
import { getStore, type Store } from "@/lib/store";
import { getStripe } from "@/lib/stripe";

// Point a Stripe webhook at /api/webhook with these events:
// checkout.session.completed, invoice.paid
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
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const accountId = session.metadata?.accountId;
      if (!accountId || session.payment_status !== "paid") return;
      await grantPro(store, accountId);
      const email = session.customer_details?.email;
      if (email) await setAccountEmail(store, accountId, email);
      const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (customer) await linkCustomer(store, customer, accountId);
      return;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      // Renewals extend Pro; the first invoice is covered by checkout.
      if (invoice.billing_reason !== "subscription_cycle") return;
      const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const accountId = customer ? await accountIdForCustomer(store, customer) : null;
      if (accountId) await grantPro(store, accountId);
      return;
    }
  }
}
