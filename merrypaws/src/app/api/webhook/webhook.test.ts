import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { createAccount, getCredits } from "@/lib/credits";
import { isUnlocked, savePortrait } from "@/lib/portraits";
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

function checkoutEvent(id: string, metadata: Record<string, string>, paymentStatus = "paid") {
  return {
    id,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        payment_status: paymentStatus,
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
    const event = checkoutEvent("evt_1", { accountId: account.id, plan: "matinee", unlockId: portrait.id });

    expect((await POST(signedRequest(event))).status).toBe(200);
    expect(await isUnlocked(store, portrait.id)).toBe(true);
    // Three credits bought, one spent on the unlock.
    expect(await getCredits(store, account.id)).toBe(2);

    // Stripe retries must not grant credits again.
    await POST(signedRequest(event));
    expect(await getCredits(store, account.id)).toBe(2);
  });

  it("ignores unpaid sessions and bad signatures", async () => {
    const { account } = await createAccount(store);
    await POST(signedRequest(checkoutEvent("evt_2", { accountId: account.id, plan: "single" }, "unpaid")));
    expect(await getCredits(store, account.id)).toBe(0);

    const forged = new Request("http://localhost/api/webhook", {
      method: "POST",
      body: JSON.stringify(checkoutEvent("evt_3", { accountId: account.id, plan: "season" })),
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
    });
    expect((await POST(forged)).status).toBe(400);
    expect(await getCredits(store, account.id)).toBe(0);
  });
});
