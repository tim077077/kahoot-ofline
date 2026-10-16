"use client";

import { api, jsonApi, localDay } from "./client";
import { isNative } from "./native";

// The daily reminder.
// - On the web: a service worker plus web push. Works in Chrome, Edge,
//   Firefox and Android browsers, and on iPhone (iOS 16.4+) once the site is
//   added to the home screen.
// - In the apps: notifications scheduled on the phone itself for the next two
//   weeks at the chosen hour, rescheduled every time the app opens or today's
//   photo goes in (so today's is skipped). No server, no push keys, and a phone
//   left alone for two weeks stops being nudged.

const HOUR_KEY = "pp_reminder_hour";
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushSupport = "ok" | "ios-install" | "denied" | "unsupported";

function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (isNative()) return "ok";
  if (!VAPID) return "unsupported";
  if (isIos() && !isStandalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

export function registerWorker() {
  if (typeof window === "undefined" || isNative() || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// Some browsers (Brave by default, or a phone on a bad connection) never
// answer a subscribe request, so give up after 15 seconds instead of spinning.
function withTimeout<T>(promise: Promise<T>, ms = 15000) {
  return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

async function subscription() {
  const reg = await withTimeout(navigator.serviceWorker.ready);
  return withTimeout((async () => (await reg.pushManager.getSubscription()) ?? reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }))());
}

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function save(token: string, hour: number) {
  const sub = await subscription();
  const res = await jsonApi("/api/push", "PUT", { subscription: sub.toJSON(), hour, tz: timeZone() }, token);
  return res.ok;
}

// Ask for permission (must run from a tap) and turn the reminder on.
export async function enableReminder(token: string, hour: number): Promise<"on" | "denied" | "failed"> {
  if (isNative()) return enableLocal(hour);
  try {
    registerWorker();
    if ((await Notification.requestPermission()) !== "granted") return "denied";
    if (!(await save(token, hour))) return "failed";
    localStorage.setItem(HOUR_KEY, String(hour));
    return "on";
  } catch {
    return "failed";
  }
}

export async function disableReminder(token: string) {
  if (isNative()) {
    localStorage.removeItem(HOUR_KEY);
    await cancelLocal().catch(() => {});
    return;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    await (await reg?.pushManager.getSubscription())?.unsubscribe();
    localStorage.removeItem(HOUR_KEY);
  } catch {
    // Nothing to undo on this device.
  }
  await api("/api/push", { method: "DELETE" }, token).catch(() => null);
}

// On every open: re-send this phone's subscription, so the server follows a
// clock change or a new time zone. Returns the hour if this phone has one.
export async function syncReminder(token: string): Promise<number | null> {
  if (isNative()) return syncLocal();
  try {
    const raw = localStorage.getItem(HOUR_KEY);
    if (raw === null || pushSupport() !== "ok" || Notification.permission !== "granted") return null;
    registerWorker();
    const hour = Number(raw);
    return (await save(token, hour)) ? hour : null;
  } catch {
    return null;
  }
}

export async function sendTestReminder(token: string) {
  if (isNative()) return testLocal();
  const res = await api("/api/push/test", { method: "POST" }, token).catch(() => null);
  return Boolean(res?.ok);
}

export const HOURS = [7, 8, 9, 12, 17, 18, 19, 20, 21];

// ---- In the apps: notifications scheduled on the phone ----

export type ReminderCopy = {
  title: string;
  body: (day: string) => string;
  // Today's photo is in, so today's reminder is skipped.
  doneToday: boolean;
  // Memorial albums never get one.
  off: boolean;
};

const FIRST_ID = 7000;
const DAYS_AHEAD = 14;
let copy: ReminderCopy | null = null;

const plugin = () => import("@capacitor/local-notifications").then((m) => m.LocalNotifications);

async function cancelLocal() {
  const notifications = Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => ({ id: FIRST_ID + i }));
  await (await plugin()).cancel({ notifications });
}

async function scheduleLocal(hour: number) {
  await cancelLocal();
  if (!copy || copy.off) return;
  const now = new Date();
  const notifications = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, 0, 0);
    if (i === 0 && (copy.doneToday || at <= now)) continue;
    const day = localDay(at);
    notifications.push({ id: FIRST_ID + i, title: copy.title, body: copy.body(day), schedule: { at, allowWhileIdle: true }, isExactNotification: false });
  }
  if (notifications.length) await (await plugin()).schedule({ notifications });
}

async function enableLocal(hour: number): Promise<"on" | "denied" | "failed"> {
  try {
    const { display } = await (await plugin()).requestPermissions();
    if (display !== "granted") return "denied";
    localStorage.setItem(HOUR_KEY, String(hour));
    await scheduleLocal(hour);
    return "on";
  } catch {
    return "failed";
  }
}

async function syncLocal(): Promise<number | null> {
  try {
    const raw = localStorage.getItem(HOUR_KEY);
    if (raw === null || (await (await plugin()).checkPermissions()).display !== "granted") return null;
    const hour = Number(raw);
    await scheduleLocal(hour);
    return hour;
  } catch {
    return null;
  }
}

async function testLocal() {
  if (!copy) return false;
  try {
    const at = new Date(Date.now() + 3000);
    await (await plugin()).schedule({ notifications: [{ id: FIRST_ID + DAYS_AHEAD, title: copy.title, body: copy.body(localDay()), schedule: { at }, isExactNotification: false }] });
    return true;
  } catch {
    return false;
  }
}

// The app calls this whenever the words or today's state change (name,
// language, memorial, today's photo going in) and the schedule follows.
export function updateLocalReminders(next: ReminderCopy) {
  copy = next;
  if (!isNative()) return;
  const raw = localStorage.getItem(HOUR_KEY);
  if (raw !== null) void scheduleLocal(Number(raw)).catch(() => {});
}
