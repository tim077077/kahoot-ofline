import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { createAccount, getCredits } from "@/lib/credits";
import { isUnlocked, savePortrait } from "@/lib/portraits";
import { TIERS } from "@/lib/config";
import { currentTier, getPlan, previewsLeft, refreshAllowance } from "@/lib/plans";
import { MemoryStore } from "@/lib/store";
import { POST } from "./route";

const SECRET = "whsec_test_secret";
let store: MemoryStore;

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  store = new MemoryStore();
  (globalThis as unknown as { __appStore: MemoryStore }).__appStore = store;
});

function signedRequest(event: object) {
  const payload = JSON.stringify(event);
  const header = new Stripe("sk_test_dummy").webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return new Request("http://localhost/api/webhook", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": header },
  });
}

function checkoutEvent(id: string, metadata: Record<string, string>, paymentStatus = "paid", mode = "payment") {
  return {
    id,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        mode,
        payment_status: paymentStatus,
        subscription: mode === "subscription" ? "sub_123" : null,
        metadata,
        customer_details: { email: "buyer@example.com" },
      },
    },
  };
}

describe("stripe webhook", () => {
  it("adds credits and unlocks the portrait the buyer paid from, once", async () => {
    const { account } = await createAccount(store);
    const portrait = await savePortrait(store, "https://v3.fal.media/files/x.jpg", "royal-court");
    const event = checkoutEvent("evt_1", { accountId: account.id, kind: "pack", pack: "p3", unlockId: portrait.id });

    expect((await POST(signedRequest(event))).status).toBe(200);
    expect(await isUnlocked(store, portrait.id)).toBe(true);
    // Three credits bought, one spent on the unlock, plus previews to use.
    expect(await getCredits(store, account.id)).toBe(2);
    expect(await previewsLeft(store, account.id)).toBe(9);

    // Stripe retries must not grant credits again.
    await POST(signedRequest(event));
    expect(await getCredits(store, account.id)).toBe(2);
  });

  it("ignores unpaid sessions and bad signatures", async () => {
    const { account } = await createAccount(store);
    await POST(signedRequest(checkoutEvent("evt_2", { accountId: account.id, kind: "pack", pack: "p10" }, "unpaid")));
    expect(await getCredits(store, account.id)).toBe(0);

    const forged = new Request("http://localhost/api/webhook", {
      method: "POST",
      body: JSON.stringify(checkoutEvent("evt_3", { accountId: account.id, kind: "pack", pack: "p25" })),
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
    });
    expect((await POST(forged)).status).toBe(400);
    expect(await getCredits(store, account.id)).toBe(0);
  });

  it("starts a plan at checkout, extends it on renewal and ends it on cancel", async () => {
    const { account } = await createAccount(store);
    const meta = { accountId: account.id, kind: "plan", tier: "plus", interval: "month" };
    await POST(signedRequest(checkoutEvent("evt_s1", meta, "paid", "subscription")));
    expect(await currentTier(store, account.id)).toBe("plus");
    expect((await getPlan(store, account.id))?.subscriptionId).toBe("sub_123");

    // The first request of the cycle refills the plan's previews and HD credits, once.
    expect(await refreshAllowance(store, account.id)).toBe(true);
    expect(await refreshAllowance(store, account.id)).toBe(false);
    expect(await previewsLeft(store, account.id)).toBe(TIERS.plus.previewsPerMonth);
    expect(await getCredits(store, account.id)).toBe(TIERS.plus.hdPerMonth);

    const periodEnd = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;
    await POST(
      signedRequest({
        id: "evt_s2",
        object: "event",
        type: "invoice.paid",
        data: {
          object: {
            id: "in_1",
            object: "invoice",
            parent: { type: "subscription_details", subscription_details: { subscription: "sub_123", metadata: meta } },
            lines: { object: "list", data: [{ period: { start: 0, end: periodEnd } }] },
          },
        },
      }),
    );
    expect((await getPlan(store, account.id))!.until).toBeGreaterThan(periodEnd * 1000);

    await POST(
      signedRequest({
        id: "evt_s3",
        object: "event",
        type: "customer.subscription.deleted",
        data: { object: { id: "sub_123", object: "subscription", metadata: meta } },
      }),
    );
    expect(await currentTier(store, account.id)).toBe("free");
    // Credits already granted stay with the member.
    expect(await getCredits(store, account.id)).toBe(TIERS.plus.hdPerMonth);
  });
});
