import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { addCredits, createAccount, getCredits } from "./credits";
import { getPortrait, isUnlocked, savePortrait, unlockWithCredit } from "./portraits";
import { MemoryStore } from "./store";
import { buildPortraitPrompt, STYLES } from "./styles";
import { makePreview } from "./watermark";

describe("unlocking portraits", () => {
  it("charges one credit, once, even when unlock is repeated", async () => {
    const store = new MemoryStore();
    const { account } = await createAccount(store);
    await addCredits(store, account.id, 2);
    const portrait = await savePortrait(store, "https://v3.fal.media/files/x.jpg", "royal");

    expect(await unlockWithCredit(store, portrait.id, account.id)).toBe("unlocked");
    expect(await unlockWithCredit(store, portrait.id, account.id)).toBe("already");
    expect(await getCredits(store, account.id)).toBe(1);
    expect(await isUnlocked(store, portrait.id)).toBe(true);
  });

  it("stays locked without credits", async () => {
    const store = new MemoryStore();
    const { account } = await createAccount(store);
    const portrait = await savePortrait(store, "https://v3.fal.media/files/x.jpg", "santa");

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
  it("always asks to keep the pet recognisable, and the owner when present", () => {
    for (const style of STYLES) {
      expect(buildPortraitPrompt(style, false)).toContain("Keep the pet exactly recognisable");
      expect(buildPortraitPrompt(style, true)).toContain("Keep the person exactly recognisable");
    }
  });
});

describe("preview watermark", () => {
  it("downsizes the image so the preview is not print quality", async () => {
    const full = await sharp({ create: { width: 2000, height: 2500, channels: 3, background: "#884422" } })
      .jpeg()
      .toBuffer();
    const preview = await makePreview(full);
    const meta = await sharp(preview).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(640);

    // The overlay actually changes pixels (a flat colour would stay flat).
    const stats = await sharp(preview).stats();
    expect(stats.channels[0].max - stats.channels[0].min).toBeGreaterThan(40);
  });
});
