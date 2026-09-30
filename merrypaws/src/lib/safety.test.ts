import { describe, expect, it } from "vitest";
import { accountForEmail, backupEmail, linkEmail, normalizeEmail, requestCode, verifyCode } from "./auth";
import { accountIdForToken, createAccount, deleteAccount } from "./credits";
import { setProfile } from "./pack";
import { getReminder, localClock, saveReminder, sendDue, utcBucket, type Notice } from "./push";
import { MemoryStore } from "./store";

const sub = { endpoint: "https://push.example.com/abc", keys: { p256dh: "p", auth: "a" } };

async function code(store: MemoryStore, email: string, purpose: "backup" | "signin", accountId: string | null, ip = "1.1.1.1") {
  const r = await requestCode(store, { email, purpose, accountId, ip });
  if (!r.ok) throw new Error(r.error);
  return r.code;
}

describe("album backup by email", () => {
  it("normalizes emails and rejects junk", () => {
    expect(normalizeEmail("  Tim@Example.COM ")).toBe("tim@example.com");
    expect(normalizeEmail("not an email")).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
  });

  it("backs up an album, then signs a new phone in to the same album", async () => {
    const store = new MemoryStore();
    const { account, token: phoneA } = await createAccount(store);
    const backup = await code(store, "tim@example.com", "backup", account.id);
    expect(await verifyCode(store, "tim@example.com", backup!)).toMatchObject({ ok: true, purpose: "backup", accountId: account.id });
    expect(await linkEmail(store, account.id, "tim@example.com")).toBe(true);
    expect(await backupEmail(store, account.id)).toBe("tim@example.com");

    const signin = await code(store, "tim@example.com", "signin", null, "2.2.2.2");
    const result = await verifyCode(store, "tim@example.com", signin!);
    expect(result).toMatchObject({ ok: true, purpose: "signin", accountId: account.id });
    // Codes work once.
    expect(await verifyCode(store, "tim@example.com", signin!)).toMatchObject({ ok: false, error: "expired" });
    expect(await accountIdForToken(store, phoneA)).toBe(account.id);
  });

  it("gives no code for an email without an album, and refuses someone else's email", async () => {
    const store = new MemoryStore();
    expect(await code(store, "nobody@example.com", "signin", null)).toBeNull();
    const a = await createAccount(store);
    const b = await createAccount(store);
    await linkEmail(store, a.account.id, "shared@example.com");
    expect(await requestCode(store, { email: "shared@example.com", purpose: "backup", accountId: b.account.id, ip: "3.3.3.3" })).toEqual({ ok: false, error: "email_in_use" });
  });

  it("throws the code away after five wrong tries", async () => {
    const store = new MemoryStore();
    const { account } = await createAccount(store);
    const right = await code(store, "t@example.com", "backup", account.id);
    const wrong = right === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect((await verifyCode(store, "t@example.com", wrong)).ok).toBe(false);
    expect(await verifyCode(store, "t@example.com", right!)).toMatchObject({ ok: false, error: "expired" });
  });

  it("limits how many codes one email can ask for", async () => {
    const store = new MemoryStore();
    const { account } = await createAccount(store);
    for (let i = 0; i < 3; i++) await code(store, "t@example.com", "backup", account.id);
    expect(await requestCode(store, { email: "t@example.com", purpose: "backup", accountId: account.id, ip: "1.1.1.1" })).toEqual({ ok: false, error: "slow_down" });
  });

  it("signs out every phone and frees the email when the account is deleted", async () => {
    const store = new MemoryStore();
    const { account, token } = await createAccount(store);
    await linkEmail(store, account.id, "t@example.com");
    const signin = await code(store, "t@example.com", "signin", null);
    await verifyCode(store, "t@example.com", signin!);
    const { issueToken } = await import("./auth");
    const phoneB = await issueToken(store, account.id);
    await deleteAccount(store, token);
    expect(await accountIdForToken(store, token)).toBeNull();
    expect(await accountIdForToken(store, phoneB)).toBeNull();
    expect(await accountForEmail(store, "t@example.com")).toBeNull();
  });
});

describe("the daily reminder", () => {
  const at = (iso: string) => new Date(iso);

  it("reads the wall clock in the member's time zone", () => {
    expect(localClock("Europe/Bucharest", at("2026-09-30T15:30:00Z"))).toEqual({ day: "2026-09-30", hour: 18 });
    expect(localClock("America/Los_Angeles", at("2026-09-30T03:00:00Z"))).toEqual({ day: "2026-09-29", hour: 20 });
    expect(utcBucket(18, "Europe/Bucharest", at("2026-09-30T12:00:00Z"))).toBe(15);
  });

  it("sends once, at the chosen hour, only if today's photo isn't in", async () => {
    const store = new MemoryStore();
    const sent: Notice[] = [];
    const send = async (_s: typeof sub, n: Notice) => (sent.push(n), "sent" as const);
    await setProfile(store, "a", { petName: "Luna" });
    await saveReminder(store, "a", sub, 18, "Europe/Bucharest");
    expect((await getReminder(store, "a"))?.bucket).toBe(utcBucket(18, "Europe/Bucharest"));

    // 18:00 in Bucharest on 30 September is 15:00 UTC.
    const six = at("2026-09-30T15:05:00Z");
    expect(await sendDue(store, send, at("2026-09-30T14:05:00Z"))).toMatchObject({ due: 0 });
    expect(await sendDue(store, send, six)).toMatchObject({ sent: 1 });
    expect(sent[0]).toMatchObject({ title: "Luna's photo of the day" });
    expect(await sendDue(store, send, six)).toMatchObject({ sent: 0, skipped: 1 });

    // Tomorrow the photo is already in: no reminder.
    await store.hset("daily:a", "2026-10-01", JSON.stringify({ kind: "photo" }));
    expect(await sendDue(store, send, at("2026-10-01T15:05:00Z"))).toMatchObject({ sent: 0, skipped: 1 });
  });

  it("never reminds a memorial album, and forgets a phone that unsubscribed", async () => {
    const store = new MemoryStore();
    const now = at("2026-09-30T15:05:00Z");
    await setProfile(store, "m", { petName: "Rex", memorial: true });
    await saveReminder(store, "m", sub, 18, "Europe/Bucharest");
    await saveReminder(store, "g", sub, 18, "Europe/Bucharest");
    const result = await sendDue(store, async () => "gone", now);
    expect(result).toMatchObject({ sent: 0, removed: 1, skipped: 1 });
    expect(await getReminder(store, "g")).toBeNull();
    expect(await getReminder(store, "m")).not.toBeNull();
  });
});
