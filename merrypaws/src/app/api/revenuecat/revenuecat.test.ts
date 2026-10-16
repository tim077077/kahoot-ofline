import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAccount, getCredits } from "@/lib/credits";
import { isUnlocked, savePortrait } from "@/lib/portraits";
import { productId, purchaseFor, TIERS } from "@/lib/config";
import { currentTier, getPlan, previewsLeft, refreshAllowance } from "@/lib/plans";
import { MemoryStore } from "@/lib/store";
import { POST } from "./route";
import { POST as pay } from "../pay/route";
import { POST as restore } from "../restore/route";
import { fakeImage, MemoryObjects } from "@/test/memoryObjects";

// /api/pay pulls in the photo storage helpers, which are marked server-only.
vi.mock("server-only", () => ({}));

const AUTH = "Bearer test-webhook-secret";
let store: MemoryStore;

beforeEach(() => {
  process.env.REVENUECAT_WEBHOOK_AUTH = AUTH;
  delete process.env.REVENUECAT_SANDBOX;
  store = new MemoryStore();
  (globalThis as unknown as { __appStore: MemoryStore }).__appStore = store;
});

function hook(event: Record<string, unknown>, auth = AUTH) {
  return new Request("http://localhost/api/revenuecat", {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: JSON.stringify({ api_version: "1.0", event: { environment: "PRODUCTION", store: "RC_BILLING", ...event } }),
  });
}

describe("product ids", () => {
  it("round-trip, including Google Play's subscription:base-plan form", () => {
    expect(productId({ kind: "plan", tier: "plus", interval: "year" })).toBe("pp_plus_yearly");
    expect(productId({ kind: "pack", pack: "p10" })).toBe("pp_pack_10");
    expect(purchaseFor("pp_plus_yearly")).toEqual({ kind: "plan", tier: "plus", interval: "year" });
    expect(purchaseFor("pp_starter:monthly")).toEqual({ kind: "plan", tier: "starter", interval: "month" });
    expect(purchaseFor("pp_pack_25")).toEqual({ kind: "pack", pack: "p25" });
    expect(purchaseFor("pp_free_monthly")).toBeNull();
    expect(purchaseFor("pp_pack_7")).toBeNull();
    expect(purchaseFor("something_else")).toBeNull();
  });
});

describe("revenuecat webhook", () => {
  it("adds pack credits and unlocks the portrait the buyer paid from, once", async () => {
    const { account, token } = await createAccount(store);
    const portrait = await savePortrait(store, new MemoryObjects(), fakeImage, "royal-court");
    const prep = await pay(
      new Request("http://localhost/api/pay", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ unlockId: portrait.id }),
      }),
    );
    expect(await prep.json()).toEqual({ accountId: account.id });

    const event = { id: "e1", type: "NON_RENEWING_PURCHASE", app_user_id: account.id, product_id: "pp_pack_3" };
    expect((await POST(hook(event))).status).toBe(200);
    expect(await isUnlocked(store, portrait.id)).toBe(true);
    // Three credits bought, one spent on the unlock, plus previews to use.
    expect(await getCredits(store, account.id)).toBe(2);
    expect(await previewsLeft(store, account.id)).toBe(9);

    // RevenueCat retries: the same event never pays out twice.
    expect((await POST(hook(event))).status).toBe(200);
    expect(await getCredits(store, account.id)).toBe(2);
  });

  it("creates the account when a new album pays", async () => {
    const res = await pay(new Request("http://localhost/api/pay", { method: "POST", body: "{}" }));
    const data = (await res.json()) as { accountId: string; token: string };
    expect(data.token).toBeTruthy();
    await POST(hook({ id: "e2", type: "NON_RENEWING_PURCHASE", app_user_id: data.accountId, product_id: "pp_pack_10" }));
    expect(await getCredits(store, data.accountId)).toBe(10);
  });

  it("refuses a wrong Authorization header and ignores sandbox unless allowed", async () => {
    const { account } = await createAccount(store);
    const event = { id: "e3", type: "NON_RENEWING_PURCHASE", app_user_id: account.id, product_id: "pp_pack_3" };
    expect((await POST(hook(event, "Bearer nope"))).status).toBe(401);
    await POST(hook({ ...event, environment: "SANDBOX" }));
    expect(await getCredits(store, account.id)).toBe(0);

    process.env.REVENUECAT_SANDBOX = "allow";
    await POST(hook({ ...event, environment: "SANDBOX" }));
    expect(await getCredits(store, account.id)).toBe(3);
  });

  it("finds the album through aliases when the purchase began anonymous", async () => {
    const { account } = await createAccount(store);
    await POST(
      hook({ id: "e4", type: "NON_RENEWING_PURCHASE", app_user_id: "$RCAnonymousID:abc", aliases: ["$RCAnonymousID:abc", account.id], product_id: "pp_pack_3" }),
    );
    expect(await getCredits(store, account.id)).toBe(3);
  });

  it("starts a plan, extends it on renewal, keeps it on cancel and ends it on expiry", async () => {
    const { account } = await createAccount(store);
    const day = 24 * 60 * 60 * 1000;
    const base = { app_user_id: account.id, product_id: "pp_plus_monthly", original_transaction_id: "tx1" };

    await POST(hook({ ...base, id: "s1", type: "INITIAL_PURCHASE", expiration_at_ms: Date.now() + 30 * day }));
    expect(await currentTier(store, account.id)).toBe("plus");
    expect((await getPlan(store, account.id))?.subscriptionId).toBe("RC_BILLING:tx1");
    expect(await refreshAllowance(store, account.id)).toBe(true);
    expect(await previewsLeft(store, account.id)).toBe(TIERS.plus.previewsPerMonth);
    expect(await getCredits(store, account.id)).toBe(TIERS.plus.hdPerMonth);

    const renewedTo = Date.now() + 60 * day;
    await POST(hook({ ...base, id: "s2", type: "RENEWAL", expiration_at_ms: renewedTo }));
    expect((await getPlan(store, account.id))!.until).toBeGreaterThan(renewedTo);

    await POST(hook({ ...base, id: "s3", type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE" }));
    expect(await currentTier(store, account.id)).toBe("plus");

    await POST(hook({ ...base, id: "s4", type: "EXPIRATION", expiration_reason: "UNSUBSCRIBE" }));
    expect(await currentTier(store, account.id)).toBe("free");
    // HD credits already granted stay.
    expect(await getCredits(store, account.id)).toBe(TIERS.plus.hdPerMonth);
  });

  it("ends the plan on a refund, but an old plan expiring leaves an upgrade alone", async () => {
    const { account } = await createAccount(store);
    const until = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await POST(hook({ id: "u1", type: "INITIAL_PURCHASE", app_user_id: account.id, product_id: "pp_starter_monthly", expiration_at_ms: until }));
    await POST(hook({ id: "u2", type: "INITIAL_PURCHASE", app_user_id: account.id, product_id: "pp_pro_yearly", expiration_at_ms: until }));
    await POST(hook({ id: "u3", type: "EXPIRATION", app_user_id: account.id, product_id: "pp_starter_monthly" }));
    expect(await currentTier(store, account.id)).toBe("pro");

    await POST(hook({ id: "u4", type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT", app_user_id: account.id, product_id: "pp_pro_yearly" }));
    expect(await currentTier(store, account.id)).toBe("free");
  });
});

describe("restore purchases", () => {
  const day = 24 * 60 * 60 * 1000;
  function restoreReq(token: string) {
    return new Request("http://localhost/api/restore", { method: "POST", headers: { authorization: `Bearer ${token}` } });
  }
  function rcReplies(subscriptions: Record<string, unknown>) {
    const fetchMock = vi.fn(async () => Response.json({ subscriber: { subscriptions } }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("switches on the best active store plan, reading Google Play's base plan", async () => {
    process.env.REVENUECAT_SECRET_KEY = "sk_test";
    const { account, token } = await createAccount(store);
    const fetchMock = rcReplies({
      pp_starter_monthly: { expires_date: new Date(Date.now() + 10 * day).toISOString(), store: "app_store" },
      pp_plus: { expires_date: new Date(Date.now() + 300 * day).toISOString(), store: "play_store", product_plan_identifier: "yearly" },
      pp_pro_monthly: { expires_date: new Date(Date.now() - day).toISOString(), store: "app_store" },
      pp_pro_yearly: { expires_date: new Date(Date.now() + 300 * day).toISOString(), store: "app_store", refunded_at: new Date().toISOString() },
    });
    const res = await restore(restoreReq(token));
    expect(await res.json()).toEqual({ restored: true, tier: "plus" });
    expect((await getPlan(store, account.id))?.interval).toBe("year");
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain(`/v1/subscribers/${account.id}`);
    vi.unstubAllGlobals();
  });

  it("finds nothing in sandbox unless allowed, and needs an album", async () => {
    process.env.REVENUECAT_SECRET_KEY = "sk_test";
    const { token } = await createAccount(store);
    rcReplies({ pp_plus_monthly: { expires_date: new Date(Date.now() + 10 * day).toISOString(), is_sandbox: true } });
    expect(await (await restore(restoreReq(token))).json()).toEqual({ restored: false, tier: "free" });
    expect((await restore(restoreReq("nobody-has-this-token-1234"))).status).toBe(401);
    vi.unstubAllGlobals();
  });
});
