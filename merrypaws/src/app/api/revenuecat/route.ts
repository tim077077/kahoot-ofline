import { timingSafeEqual } from "node:crypto";
import { PACKS, purchaseFor } from "@/lib/config";
import { addCredits, claimEvent, setAccountEmail } from "@/lib/credits";
import { track } from "@/lib/events";
import { activatePlan, addPackPreviews, endPlan, getPlan, GRACE_MS } from "@/lib/plans";
import { unlockWithCredit } from "@/lib/portraits";
import { getStore, type Store } from "@/lib/store";

// RevenueCat webhook: every store (Web Billing, App Store, Google Play) lands
// here. In RevenueCat, Integrations → Webhooks: point it at /api/revenuecat
// and set the Authorization header to REVENUECAT_WEBHOOK_AUTH.
//
// The album's account id is the RevenueCat App User ID, so a purchase on any
// device maps straight back to the album.

type RcEvent = {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  expiration_at_ms?: number | null;
  environment?: "SANDBOX" | "PRODUCTION";
  store?: string;
  original_transaction_id?: string;
  cancel_reason?: string;
  subscriber_attributes?: Record<string, { value?: string }>;
};

function authorized(header: string | null) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!process.env.REVENUECAT_WEBHOOK_AUTH) return new Response("webhook not configured", { status: 400 });
  if (!authorized(request.headers.get("authorization"))) return new Response("unauthorized", { status: 401 });

  const body = (await request.json().catch(() => null)) as { event?: RcEvent } | null;
  const event = body?.event;
  if (!event?.id || !event.type) return new Response("bad payload", { status: 400 });

  // Test-store purchases (TestFlight, Play testing, Web Billing sandbox) only
  // count where REVENUECAT_SANDBOX=allow, so testers can't unlock production.
  if (event.environment === "SANDBOX" && process.env.REVENUECAT_SANDBOX !== "allow") return Response.json({ received: true, sandbox: true });

  const store = getStore();
  if (!(await claimEvent(store, `rc:${event.id}`))) return Response.json({ received: true, duplicate: true });

  try {
    await handleEvent(store, event);
  } catch (err) {
    // Let RevenueCat's retry reprocess this event.
    await store.del(`evt:rc:${event.id}`);
    console.error("revenuecat webhook failed", event.type, err);
    return new Response("handler error", { status: 500 });
  }
  return Response.json({ received: true });
}

// Anonymous RevenueCat ids ($RCAnonymousID:...) never belong to an album;
// look through the aliases for the one that does.
async function accountOf(store: Store, event: RcEvent) {
  const ids = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  for (const id of ids) {
    if (id && !id.startsWith("$RCAnonymousID:") && (await store.get(`acct:${id}`))) return id;
  }
  return null;
}

async function handleEvent(store: Store, event: RcEvent) {
  const purchase = purchaseFor(event.product_id);
  if (!purchase) return;
  const accountId = await accountOf(store, event);
  if (!accountId) {
    console.warn("revenuecat event for an unknown account", event.type, event.app_user_id);
    return;
  }
  const email = event.subscriber_attributes?.$email?.value;

  if (purchase.kind === "pack") {
    if (event.type !== "NON_RENEWING_PURCHASE") return;
    const pack = PACKS[purchase.pack];
    await addCredits(store, accountId, pack.credits);
    await addPackPreviews(store, accountId, pack.credits);
    await track(store, "purchase");
    if (email) await setAccountEmail(store, accountId, email);
    const unlockId = await store.get(`payunlock:${accountId}`);
    if (unlockId) {
      await store.del(`payunlock:${accountId}`);
      await unlockWithCredit(store, unlockId, accountId);
    }
    return;
  }

  const { tier, interval } = purchase;
  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION": {
      if (!event.expiration_at_ms) return;
      const subscriptionId = event.original_transaction_id ? `${event.store ?? "rc"}:${event.original_transaction_id}` : undefined;
      await activatePlan(store, accountId, { tier, interval, until: event.expiration_at_ms + GRACE_MS, subscriptionId });
      if (event.type === "INITIAL_PURCHASE") await track(store, "purchase");
      if (email) await setAccountEmail(store, accountId, email);
      return;
    }
    case "EXPIRATION":
    case "CANCELLATION": {
      // A plain cancellation keeps the plan until it runs out; a refund
      // (CUSTOMER_SUPPORT) ends it now. Only end the plan this product is
      // for, so an old plan expiring after an upgrade leaves the new one.
      if (event.type === "CANCELLATION" && event.cancel_reason !== "CUSTOMER_SUPPORT") return;
      const plan = await getPlan(store, accountId);
      if (plan?.tier === tier) await endPlan(store, accountId);
      return;
    }
  }
}
