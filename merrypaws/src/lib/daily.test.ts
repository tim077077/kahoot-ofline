import { describe, expect, it } from "vitest";
import { addDays, freezesLeft, grantFreezes, isValidDay, markDay, recentDays, setShared, settleStreak } from "./daily";
import type { ObjectStore } from "./objects";
import { inviteCode, joinPack, leavePack, packFeed, react, setProfile } from "./pack";
import { addPhoto } from "./photos";
import { MemoryStore } from "./store";

const D = "2026-09-01";
const day = (n: number) => addDays(D, n);

describe("the daily roll", () => {
  it("counts consecutive days once each and reports milestones", async () => {
    const store = new MemoryStore();
    expect((await markDay(store, "a", day(0), { kind: "photo" }, false)).count).toBe(1);
    expect((await markDay(store, "a", day(0), { kind: "portrait" }, false)).newDay).toBe(false);
    await markDay(store, "a", day(1), { kind: "photo" }, false);
    const third = await markDay(store, "a", day(2), { kind: "photo" }, false);
    expect(third).toMatchObject({ count: 3, milestone: 3 });
  });

  it("spends a freeze on a missed day, and breaks without one", async () => {
    const store = new MemoryStore();
    await grantFreezes(store, "a", "free", day(0));
    await grantFreezes(store, "a", "free", day(3)); // same month: granted once
    expect(await freezesLeft(store, "a")).toBe(1);
    await markDay(store, "a", day(0), { kind: "photo" }, false);
    expect((await markDay(store, "a", day(2), { kind: "photo" }, false)).count).toBe(2);
    expect(await freezesLeft(store, "a")).toBe(0);
    expect((await recentDays(store, "a", day(2), 3)).map((d) => d.state)).toEqual(["done", "frozen", "done"]);
    // Two days missed with no freezes left: back to day one.
    expect((await markDay(store, "a", day(5), { kind: "photo" }, false)).count).toBe(1);
  });

  it("pauses instead of breaking while a free album is full", async () => {
    const store = new MemoryStore();
    await markDay(store, "a", day(0), { kind: "photo" }, false);
    await markDay(store, "a", day(1), { kind: "photo" }, false);
    const settled = await settleStreak(store, "a", day(9), true);
    expect(settled).toMatchObject({ count: 2, outcome: "paused" });
    expect((await markDay(store, "a", day(9), { kind: "photo" }, false)).count).toBe(3);
  });

  it("only accepts a day within a day of the server's date", () => {
    const now = Date.parse("2026-09-30T12:00:00Z");
    expect(isValidDay("2026-09-30", now)).toBe(true);
    expect(isValidDay("2026-09-29", now)).toBe(true);
    expect(isValidDay("2026-09-20", now)).toBe(false);
    expect(isValidDay("30/09/2026", now)).toBe(false);
  });
});

const objects: ObjectStore = { put: async () => {}, del: async () => {}, url: async (k) => `https://bucket.test/${k}` };

describe("the pack", () => {
  it("joins by invite code, shows today's photo and counts reactions", async () => {
    const store = new MemoryStore();
    await setProfile(store, "luna", { petName: "Luna", kind: "dog" });
    await setProfile(store, "milo", { petName: "Milo", kind: "cat" });
    const code = await inviteCode(store, "luna");
    expect(await inviteCode(store, "luna")).toBe(code);
    expect(await joinPack(store, "luna", code)).toBe("self");
    expect(await joinPack(store, "milo", code)).toBe("joined");
    expect(await joinPack(store, "milo", code)).toBe("already");

    const added = await addPhoto(store, objects, "luna", "free", { image: new Uint8Array([1]), thumb: new Uint8Array([2]), w: 1, h: 1 });
    if (!added.ok) throw new Error("not added");
    await markDay(store, "luna", day(0), { kind: "photo", photoId: added.photo.id }, false);
    expect(await react(store, "milo", "luna", day(0), "paw")).toBe(true);
    expect(await react(store, "stranger", "luna", day(0), "paw")).toBe(false);

    const [me, luna] = await packFeed(store, objects, "milo", day(0));
    expect(me.profile.petName).toBe("Milo");
    expect(luna).toMatchObject({ profile: { petName: "Luna" }, streak: 1, reactions: { counts: { paw: 1 }, mine: "paw" } });
    expect(luna.today?.thumb).toContain("_t.jpg");

    // Hidden from the pack: friends stop seeing it, the owner still does.
    await setShared(store, "luna", day(0), false);
    expect((await packFeed(store, objects, "milo", day(0)))[1].today).toBeNull();
    expect((await packFeed(store, objects, "luna", day(0)))[0].today).not.toBeNull();

    await leavePack(store, "milo", "luna");
    expect(await packFeed(store, objects, "milo", day(0))).toHaveLength(1);
  });
});
