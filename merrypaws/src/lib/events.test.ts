import { describe, expect, it } from "vitest";
import { isClientEvent, readStats, track } from "./events";
import { MemoryStore } from "./store";

describe("funnel events", () => {
  it("counts events per day", async () => {
    const store = new MemoryStore();
    const today = new Date("2026-09-29T12:00:00Z");
    const yesterday = new Date("2026-09-28T12:00:00Z");
    await track(store, "reveal_seen", today);
    await track(store, "reveal_seen", today);
    await track(store, "purchase", yesterday);
    const stats = await readStats(store, 2, today);
    expect(stats[0]).toEqual({ day: "2026-09-29", counts: { reveal_seen: 2 } });
    expect(stats[1]).toEqual({ day: "2026-09-28", counts: { purchase: 1 } });
  });

  it("only accepts known client events", () => {
    expect(isClientEvent("share")).toBe(true);
    expect(isClientEvent("purchase")).toBe(false);
    expect(isClientEvent("anything")).toBe(false);
  });
});
