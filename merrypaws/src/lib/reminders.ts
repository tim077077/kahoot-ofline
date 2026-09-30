"use client";

import { api, jsonApi } from "./client";

// The daily reminder on the web: a service worker plus web push. Works in
// Chrome, Edge, Firefox and Android browsers, and on iPhone (iOS 16.4+) once
// the site is added to the home screen. The store app will use native push.

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
  if (typeof window === "undefined" || !VAPID) return "unsupported";
  if (isIos() && !isStandalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

export function registerWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
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
  const res = await api("/api/push/test", { method: "POST" }, token).catch(() => null);
  return Boolean(res?.ok);
}

export const HOURS = [7, 8, 9, 12, 17, 18, 19, 20, 21];
export const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString("en", { hour: "numeric" });
