import { describe, expect, it } from "vitest";
import { TIERS } from "./config";
import type { ObjectStore } from "./objects";
import { addPhoto, deleteAllPhotos, listPhotos, updatePhoto } from "./photos";
import { activatePlan, addPackPreviews, currentTier, refreshAllowance, releasePreview, takePreview } from "./plans";
import { MemoryStore } from "./store";

function fakeObjects() {
  const files = new Map<string, Uint8Array>();
  const objects: ObjectStore = {
    put: async (key, body) => void files.set(key, body),
    del: async (key) => void files.delete(key),
    url: async (key) => `https://bucket.test/${key}`,
  };
  return { files, objects };
}

const photo = { image: new Uint8Array([1]), thumb: new Uint8Array([2]), w: 1600, h: 2000 };

describe("plans", () => {
  it("lapses after the paid period", async () => {
    const store = new MemoryStore();
    const now = Date.now();
    await activatePlan(store, "a", { tier: "pro", interval: "year", until: now + 1000 }, now);
    expect(await currentTier(store, "a", now)).toBe("pro");
    expect(await currentTier(store, "a", now + 2000)).toBe("free");
    expect(await refreshAllowance(store, "a", now + 2000)).toBe(false);
  });

  it("spends plan previews before pack previews and can give one back", async () => {
    const store = new MemoryStore();
    await activatePlan(store, "a", { tier: "plus", interval: "month", until: Date.now() + 1e9 });
    await refreshAllowance(store, "a");
    await addPackPreviews(store, "a", 1);
    const sources = [];
    for (let i = 0; i < TIERS.plus.previewsPerMonth + 4; i++) sources.push(await takePreview(store, "a"));
    expect(sources.filter((s) => s === "plan")).toHaveLength(TIERS.plus.previewsPerMonth);
    expect(sources.filter((s) => s === "pack")).toHaveLength(3);
    expect(sources.at(-1)).toBeNull();
    await releasePreview(store, "a", "pack");
    expect(await takePreview(store, "a")).toBe("pack");
  });
});

describe("album", () => {
  it("holds as many photos as the plan allows and never deletes on downgrade", async () => {
    const store = new MemoryStore();
    const { objects, files } = fakeObjects();
    for (let i = 0; i < TIERS.free.photos; i++) expect((await addPhoto(store, objects, "a", "free", photo)).ok).toBe(true);
    expect(await addPhoto(store, objects, "a", "free", photo)).toEqual({ ok: false, error: "photo_limit" });
    expect((await addPhoto(store, objects, "a", "plus", photo)).ok).toBe(true);
    expect(await listPhotos(store, objects, "a")).toHaveLength(TIERS.free.photos + 1);
    expect(files.size).toBe((TIERS.free.photos + 1) * 2);
  });

  it("tags photos with activities and deletes every file with the album", async () => {
    const store = new MemoryStore();
    const { objects, files } = fakeObjects();
    const added = await addPhoto(store, objects, "a", "free", { ...photo, tags: ["walks", " Walks ", "Beach days", 4] });
    if (!added.ok) throw new Error("not added");
    expect(added.photo.tags).toEqual(["walks", "Beach days"]);
    const updated = await updatePhoto(store, objects, "a", added.photo.id, { favorite: true, caption: "  First  walk " });
    expect(updated).toMatchObject({ favorite: true, caption: "First walk", thumb: expect.stringContaining("_t.jpg") });
    expect(await deleteAllPhotos(store, objects, "a")).toBe(1);
    expect(files.size).toBe(0);
    expect(await listPhotos(store, objects, "a")).toEqual([]);
  });
});
