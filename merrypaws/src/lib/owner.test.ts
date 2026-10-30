import { afterEach, describe, expect, it, vi } from "vitest";
import { claimOwner, isOwner } from "./owner";
import { currentTier } from "./plans";
import { MemoryStore } from "./store";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

describe("owner mode", () => {
  it("turns on only with the exact code", async () => {
    vi.stubEnv("OWNER_CODE", "a-long-owner-code-123");
    const store = new MemoryStore();
    expect(await claimOwner(store, "acc1", "a-long-owner-code-12", "1.1.1.1")).toBe("wrong");
    expect(await isOwner(store, "acc1")).toBe(false);
    expect(await claimOwner(store, "acc1", " a-long-owner-code-123 ", "1.1.1.1")).toBe("owner");
    expect(await isOwner(store, "acc1")).toBe(true);
    expect(await currentTier(store, "acc1")).toBe("pro");
    expect(await isOwner(store, "acc2")).toBe(false);
  });

  it("is off without a long enough code, and can't be guessed fast", async () => {
    const store = new MemoryStore();
    vi.stubEnv("OWNER_CODE", "short");
    expect(await claimOwner(store, "acc1", "short", "1.1.1.1")).toBe("off");
    vi.stubEnv("OWNER_CODE", "a-long-owner-code-123");
    const now = new Date("2026-10-30T10:00:00Z");
    for (let i = 0; i < 10; i++) expect(await claimOwner(store, "acc1", "guess", "2.2.2.2", now)).toBe("wrong");
    expect(await claimOwner(store, "acc1", "a-long-owner-code-123", "2.2.2.2", now)).toBe("slow_down");
  });
});

describe("free for testing", () => {
  it("makes every album an owner, with a site-wide daily cap", async () => {
    const { underTestingCap, releaseTestingCap, TESTING_PORTRAITS_PER_DAY } = await import("./owner");
    vi.stubEnv("FREE_FOR_TESTING", "1");
    const store = new MemoryStore();
    expect(await isOwner(store, "anyone")).toBe(true);
    expect(await isOwner(store, null)).toBe(false);
    const now = new Date("2026-10-30T10:00:00Z");
    for (let i = 0; i < TESTING_PORTRAITS_PER_DAY; i++) expect(await underTestingCap(store, now)).toBe(true);
    expect(await underTestingCap(store, now)).toBe(false);
    await releaseTestingCap(store, now);
    expect(await underTestingCap(store, now)).toBe(true);
    expect(await underTestingCap(store, new Date("2026-10-31T10:00:00Z"))).toBe(true);
  });
});
