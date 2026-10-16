import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { jsonApi } from "./client";
import { isNative } from "./native";

// Native push in the Android and iOS apps, for friends' reactions. Off until the
// build has Firebase config (google-services.json / GoogleService-Info.plist):
// asking Firebase for a token without it crashes the app.
export const appPushOn = () => isNative() && process.env.NEXT_PUBLIC_NATIVE_PUSH === "1";

export type AppPushState = "granted" | "prompt" | "denied" | "off";

export async function appPushState(): Promise<AppPushState> {
  if (!appPushOn()) return "off";
  const { receive } = await FirebaseMessaging.checkPermissions();
  return receive === "granted" ? "granted" : receive === "denied" ? "denied" : "prompt";
}

let current: string | null = null;

async function register(apiToken: string, token: string) {
  current = token;
  await jsonApi("/api/push/devices", "PUT", { token, platform: Capacitor.getPlatform() }, apiToken).catch(() => null);
}

// On every open (tokens rotate), and right after the user says yes.
export async function syncAppPush(apiToken: string) {
  if ((await appPushState()) !== "granted") return;
  const { token } = await FirebaseMessaging.getToken();
  if (token) await register(apiToken, token);
}

export async function enableAppPush(apiToken: string): Promise<AppPushState> {
  if (!appPushOn()) return "off";
  const { receive } = await FirebaseMessaging.requestPermissions();
  if (receive !== "granted") return receive === "denied" ? "denied" : "prompt";
  await syncAppPush(apiToken);
  return "granted";
}

// Leaving this album on this phone: its reactions shouldn't follow you.
export async function forgetAppPush(apiToken: string) {
  if (!appPushOn() || !current) return;
  await jsonApi("/api/push/devices", "DELETE", { token: current }, apiToken).catch(() => null);
  current = null;
}

let listening = false;

// Tapping a reaction push opens the Pack; a rotated token re-registers.
export function listenAppPush(getApiToken: () => string | null, onOpen: (tab: string) => void) {
  if (!appPushOn() || listening) return;
  listening = true;
  void FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
    const tab = (notification.data as { tab?: string } | undefined)?.tab;
    if (tab) onOpen(tab);
  });
  void FirebaseMessaging.addListener("tokenReceived", ({ token }) => {
    const apiToken = getApiToken();
    if (apiToken && token) void register(apiToken, token);
  });
}
