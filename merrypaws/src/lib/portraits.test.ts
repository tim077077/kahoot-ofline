import * as jpeg from "jpeg-js";
import { encode as encodePng } from "fast-png";
import { describe, expect, it } from "vitest";
import { addCredits, createAccount, getCredits } from "./credits";
import { getPortrait, isUnlocked, savePortrait, unlockWithCredit } from "./portraits";
import { MemoryStore } from "./store";
import { buildPortraitPrompt, STYLES } from "./styles";
import { makePreview } from "./watermark";
import { fakeImage, MemoryObjects } from "@/test/memoryObjects";

describe("unlocking portraits", () => {
  it("charges one credit, once, even when unlock is repeated", async () => {
    const store = new MemoryStore();
    const { account } = await createAccount(store);
    await addCredits(store, account.id, 2);
    const portrait = await savePortrait(store, new MemoryObjects(), fakeImage, "royal-court");

    expect(await unlockWithCredit(store, portrait.id, account.id)).toBe("unlocked");
    expect(await unlockWithCredit(store, portrait.id, account.id)).toBe("already");
    expect(await getCredits(store, account.id)).toBe(1);
    expect(await isUnlocked(store, portrait.id)).toBe(true);
  });

  it("stays locked without credits", async () => {
    const store = new MemoryStore();
    const { account } = await createAccount(store);
    const portrait = await savePortrait(store, new MemoryObjects(), fakeImage, "holiday-special");

    expect(await unlockWithCredit(store, portrait.id, account.id)).toBe("no_credits");
    expect(await isUnlocked(store, portrait.id)).toBe(false);
    // A later purchase can still unlock it.
    await addCredits(store, account.id, 1);
    expect(await unlockWithCredit(store, portrait.id, account.id)).toBe("unlocked");
  });

  it("rejects unknown or malformed ids", async () => {
    const store = new MemoryStore();
    expect(await getPortrait(store, "../../etc/passwd")).toBeNull();
    expect(await unlockWithCredit(store, "00000000-0000-0000-0000-000000000000", "acct")).toBe("missing");
  });
});

describe("prompts", () => {
  it("puts identity first and covers the whole scene for every era", () => {
    for (const style of STYLES) {
      const alone = buildPortraitPrompt(style, false);
      const together = buildPortraitPrompt(style, true);
      expect(alone.indexOf("Keep the pet exactly recognisable")).toBeLessThan(alone.indexOf("The setting"));
      expect(alone).not.toContain("Keep the person");
      expect(together).toContain("Keep the person exactly recognisable");
      expect(together).toContain(style.prompt.ownerWardrobe);
      expect(together).toContain(style.prompt.ownerPose);
      for (const part of ["medium", "wardrobe", "set", "pose", "light", "camera", "palette", "texture", "mood", "avoid"] as const) {
        expect(alone).toContain(style.prompt[part]);
      }
    }
  });

  it("never names a trademark", () => {
    const all = STYLES.map((s) => buildPortraitPrompt(s, true) + s.title + s.blurb).join(" ").toLowerCase();
    for (const mark of ["technicolor", "kodak", "kodachrome", "ektachrome", "polaroid", "hollywood", "disney", "pixar", "ghibli", "chaplin"]) {
      expect(all).not.toContain(mark);
    }
  });
});

describe("preview watermark", () => {
  const flat = (width: number, height: number, channels: number) => {
    const data = new Uint8Array(width * height * channels);
    for (let i = 0; i < data.length; i += channels) data.set([0x88, 0x44, 0x22, 255].slice(0, channels), i);
    return data;
  };
  const range = (jpg: Buffer) => {
    const img = jpeg.decode(jpg, { useTArray: true });
    let min = 255, max = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      min = Math.min(min, img.data[i]);
      max = Math.max(max, img.data[i]);
    }
    return { width: img.width, height: img.height, spread: max - min };
  };

  it("downsizes a JPEG so the preview is not print quality, and marks it", async () => {
    const full = jpeg.encode({ width: 2000, height: 2500, data: flat(2000, 2500, 4) }, 90).data;
    const preview = await makePreview(full);
    expect([preview[0], preview[1]]).toEqual([0xff, 0xd8]);
    const { width, height, spread } = range(preview);
    expect(Math.max(width, height)).toBeLessThanOrEqual(640);
    expect(width / height).toBeCloseTo(0.8, 1);
    // The overlay actually changes pixels (a flat colour would stay flat).
    expect(spread).toBeGreaterThan(40);
  });

  it("reads the PNGs Gemini returns", async () => {
    const full = encodePng({ width: 896, height: 1120, data: flat(896, 1120, 3), channels: 3, depth: 8 });
    const { width, height, spread } = range(await makePreview(full));
    expect([width, height]).toEqual([512, 640]);
    expect(spread).toBeGreaterThan(40);
  });

  it("refuses formats it can't read", async () => {
    await expect(makePreview(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).rejects.toThrow("Only JPEG and PNG");
  });
});

describe("saving portraits", () => {
  it("keeps the full image in the object store, not in the database", async () => {
    const store = new MemoryStore();
    const objects = new MemoryObjects();
    const portrait = await savePortrait(store, objects, { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" }, "film-noir");
    expect(portrait.fullKey).toBe(`portraits/${portrait.id}.png`);
    expect(objects.files.get(portrait.fullKey)?.contentType).toBe("image/png");
    expect(await store.get(`portrait:${portrait.id}`)).not.toContain("AQID");
    expect((await getPortrait(store, portrait.id))?.mimeType).toBe("image/png");
  });
});
