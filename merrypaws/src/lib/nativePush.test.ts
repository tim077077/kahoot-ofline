import { describe, expect, it, vi } from "vitest";
import type { NativeMessage, NativeSender } from "./fcm";
import { deviceTokens, notifyReaction, removeDeviceToken, saveDeviceToken } from "./nativePush";
import { setProfile } from "./pack";
import { MemoryStore } from "./store";

const TOKEN = (n: number) => `token-${n}-${"x".repeat(30)}`;

describe("reaction push", () => {
  it("keeps the newest five phones", async () => {
    const store = new MemoryStore();
    for (let i = 0; i < 7; i++) {
      vi.setSystemTime(1_000 + i);
      await saveDeviceToken(store, "luna", TOKEN(i), "android");
    }
    vi.useRealTimers();
    expect((await deviceTokens(store, "luna")).sort()).toEqual([2, 3, 4, 5, 6].map(TOKEN).sort());
    await removeDeviceToken(store, "luna", TOKEN(6));
    expect(await deviceTokens(store, "luna")).toHaveLength(4);
    await removeDeviceToken(store, "luna");
    expect(await deviceTokens(store, "luna")).toEqual([]);
  });

  it("sends once per friend per photo, in the owner's language, and drops dead tokens", async () => {
    const store = new MemoryStore();
    await setProfile(store, "luna", { petName: "Luna", kind: "dog", memorial: false, locale: "de" });
    await setProfile(store, "milo", { petName: "Milo", kind: "cat", memorial: false });
    await saveDeviceToken(store, "luna", TOKEN(1), "android");
    await saveDeviceToken(store, "luna", TOKEN(2), "ios");
    const sent: [string, NativeMessage][] = [];
    const send: NativeSender = async (token, message) => {
      sent.push([token, message]);
      return token === TOKEN(2) ? "gone" : "sent";
    };

    expect(await notifyReaction(store, send, "milo", "luna", "2026-10-16", "paw")).toBe(1);
    expect(sent).toHaveLength(2);
    expect(sent[0][1]).toMatchObject({ title: "🐾 von Milo", body: "Lunas Foto des Tages kam gut an.", data: { tab: "pack" } });
    expect(await deviceTokens(store, "luna")).toEqual([TOKEN(1)]);

    // Un-react, react again: no second buzz.
    expect(await notifyReaction(store, send, "milo", "luna", "2026-10-16", "heart")).toBe(0);
    expect(sent).toHaveLength(2);
  });

  it("does nothing without Firebase or without a phone", async () => {
    const store = new MemoryStore();
    const send = vi.fn<NativeSender>();
    expect(await notifyReaction(store, null, "milo", "luna", "2026-10-16", "paw")).toBe(0);
    expect(await notifyReaction(store, send, "milo", "luna", "2026-10-16", "paw")).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});
