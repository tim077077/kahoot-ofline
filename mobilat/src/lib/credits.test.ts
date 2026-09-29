import { describe, expect, it } from "vitest";
import {
  accountIdForToken,
  addCredits,
  claimEvent,
  createAccount,
  freeTrialsLeft,
  getCredits,
  releaseFreeTrial,
  takeCredit,
  takeFreeTrial,
} from "./credits";
import { buildPrompt, parseOptions } from "./prompts";
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
  it("allows the per-IP quota and gives it back on failure", async () => {
    const store = new MemoryStore();
    const limits = { perIp: 1, global: 10 };
    expect(await takeFreeTrial(store, "1.1.1.1", limits)).toBe(true);
    expect(await takeFreeTrial(store, "1.1.1.1", limits)).toBe(false);
    expect(await freeTrialsLeft(store, "1.1.1.1", limits)).toBe(0);
    await releaseFreeTrial(store, "1.1.1.1");
    expect(await freeTrialsLeft(store, "1.1.1.1", limits)).toBe(1);
  });

  it("stops everyone once the global daily budget is spent", async () => {
    const store = new MemoryStore();
    const limits = { perIp: 5, global: 2 };
    expect(await takeFreeTrial(store, "a", limits)).toBe(true);
    expect(await takeFreeTrial(store, "b", limits)).toBe(true);
    expect(await takeFreeTrial(store, "c", limits)).toBe(false);
    expect(await freeTrialsLeft(store, "c", limits)).toBe(0);
    // The rejected request didn't eat into c's own quota.
    await releaseFreeTrial(store, "a");
    expect(await freeTrialsLeft(store, "c", limits)).toBe(5);
  });
});

describe("prompts", () => {
  it("rejects unknown options", () => {
    expect(parseOptions({ mode: "stage", room: "garage", style: "modern" })).toBeNull();
    expect(parseOptions({ mode: "stage", room: "living", style: "modern" })).toEqual({
      mode: "stage",
      room: "living",
      style: "modern",
    });
  });

  it("always pins the room architecture", () => {
    for (const mode of ["stage", "empty", "restyle"] as const) {
      expect(buildPrompt(mode, "bedroom", "japandi")).toContain("Do not add or remove windows or doors");
    }
  });
});
