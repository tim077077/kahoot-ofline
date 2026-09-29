import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { accountIdForCustomer, createAccount } from "@/lib/credits";
import { isPro } from "@/lib/pro";
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
  return new Request("http://localhost/api/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } });
}

describe("stripe webhook", () => {
  it("turns on Pro after checkout and remembers the customer for renewals", async () => {
    const { account } = await createAccount(store);
    const res = await POST(
      signedRequest({
        id: "evt_1",
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: {
            object: "checkout.session",
            payment_status: "paid",
            metadata: { accountId: account.id, plan: "pro" },
            customer: "cus_123",
            customer_details: { email: "creator@example.com" },
          },
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await isPro(store, account.id)).toBe(true);
    expect(await accountIdForCustomer(store, "cus_123")).toBe(account.id);
  });

  it("extends Pro on renewal invoices only", async () => {
    const { account } = await createAccount(store);
    await store.set("cust:cus_9", account.id);
    const invoice = (id: string, billing_reason: string) =>
      signedRequest({ id, object: "event", type: "invoice.paid", data: { object: { object: "invoice", billing_reason, customer: "cus_9" } } });

    await POST(invoice("evt_a", "subscription_create"));
    expect(await isPro(store, account.id)).toBe(false);
    await POST(invoice("evt_b", "subscription_cycle"));
    expect(await isPro(store, account.id)).toBe(true);
  });

  it("rejects forged events", async () => {
    const forged = new Request("http://localhost/api/webhook", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
    });
    expect((await POST(forged)).status).toBe(400);
  });
});
