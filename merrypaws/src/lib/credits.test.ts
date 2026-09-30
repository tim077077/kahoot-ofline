import { describe, expect, it } from "vitest";
import {
  accountIdForToken,
  addCredits,
  claimEvent,
  createAccount,
  deleteAccount,
  freeTrialsLeft,
  getCredits,
  releaseFreeTrial,
  takeMinuteSlot,
  takeCredit,
  takeFreeTrial,
} from "./credits";
import { MemoryStore } from "./store";

describe("accounts and credits", () => {
  it("resolves a token to its account and rejects unknown tokens", async () => {
    const store = new MemoryStore();
    const { account, token } = await createAccount(store);
    expect(await accountIdForToken(store, token)).toBe(account.id);
    expect(await accountIdForToken(store, "x".repeat(32))).toBeNull();
    expect(await accountIdForToken(store, null)).toBeNull();
  });

  it("never spends below zero, even with parallel requests", async () => {
    const store = new MemoryStore();
    const { account } = await createAccount(store);
    await addCredits(store, account.id, 2);
    const results = await Promise.all([1, 2, 3, 4].map(() => takeCredit(store, account.id)));
    expect(results.filter(Boolean)).toHaveLength(2);
    expect(await getCredits(store, account.id)).toBe(0);
  });

  it("processes each Stripe event once", async () => {
    const store = new MemoryStore();
    expect(await claimEvent(store, "evt_1")).toBe(true);
    expect(await claimEvent(store, "evt_1")).toBe(false);
  });
});

describe("free trials", () => {
  const guest = (device: string, ip = "1.1.1.1") => ({ device, ip });

  it("gives each device one free portrait, and gives it back on failure", async () => {
    const store = new MemoryStore();
    const limits = { perDevice: 1, perIp: 3, global: 10 };
    expect(await takeFreeTrial(store, guest("phone"), limits)).toBe(true);
    expect(await takeFreeTrial(store, guest("phone"), limits)).toBe(false);
    expect(await freeTrialsLeft(store, guest("phone"), limits)).toBe(0);
    await releaseFreeTrial(store, guest("phone"));
    expect(await freeTrialsLeft(store, guest("phone"), limits)).toBe(1);
  });

  it("caps an IP even when the device id keeps changing", async () => {
    const store = new MemoryStore();
    const limits = { perDevice: 1, perIp: 2, global: 10 };
    expect(await takeFreeTrial(store, guest("a"), limits)).toBe(true);
    expect(await takeFreeTrial(store, guest("b"), limits)).toBe(true);
    expect(await takeFreeTrial(store, guest("c"), limits)).toBe(false);
    // The refused device still has its own trial for another network.
    expect(await takeFreeTrial(store, guest("c", "2.2.2.2"), limits)).toBe(true);
  });

  it("stops everyone once the global daily budget is spent", async () => {
    const store = new MemoryStore();
    const limits = { perDevice: 1, perIp: 5, global: 2 };
    expect(await takeFreeTrial(store, guest("a", "1"), limits)).toBe(true);
    expect(await takeFreeTrial(store, guest("b", "2"), limits)).toBe(true);
    expect(await takeFreeTrial(store, guest("c", "3"), limits)).toBe(false);
    expect(await freeTrialsLeft(store, guest("c", "3"), limits)).toBe(0);
    // The rejected request didn't eat into c's own trial.
    await releaseFreeTrial(store, guest("a", "1"));
    expect(await freeTrialsLeft(store, guest("c", "3"), limits)).toBe(1);
  });
});

describe("buyers and deletion", () => {
  it("limits previews per minute", async () => {
    const store = new MemoryStore();
    expect(await takeMinuteSlot(store, "acct", 2)).toBe(true);
    expect(await takeMinuteSlot(store, "acct", 2)).toBe(true);
    expect(await takeMinuteSlot(store, "acct", 2)).toBe(false);
  });

  it("deletes an account so its token and tickets are gone", async () => {
    const store = new MemoryStore();
    const { account, token } = await createAccount(store);
    await addCredits(store, account.id, 3);
    expect(await deleteAccount(store, token)).toBe(true);
    expect(await accountIdForToken(store, token)).toBeNull();
    expect(await getCredits(store, account.id)).toBe(0);
    expect(await deleteAccount(store, token)).toBe(false);
  });
});
