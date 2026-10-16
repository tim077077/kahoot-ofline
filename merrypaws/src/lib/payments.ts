import { Capacitor } from "@capacitor/core";
import { listPrice, PACK_ORDER, PAID_TIERS, productId, type Price, type Purchase } from "./config";

// Payments go through RevenueCat everywhere, with the same product IDs and
// the album's account id as the App User ID, so every purchase lands on the
// server through /api/revenuecat whichever store took the money:
//   - the website uses Web Billing (payments-web.ts),
//   - the Android and iOS apps use the App Store / Google Play through the
//     Capacitor SDK (payments-native.ts). Web checkout inside a store app
//     breaks both stores' rules, so the app build never has the web key.
//
// Each SDK loads only when someone opens a paywall.

const NATIVE = Capacitor.isNativePlatform();
const NATIVE_KEY = Capacitor.getPlatform() === "ios" ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY : process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
const WEB_KEY = process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY;
const KEY = NATIVE ? NATIVE_KEY : WEB_KEY;

export const paymentsOn = Boolean(KEY);
// Apple wants a "Restore purchases" button wherever the app sells
// subscriptions; on the web purchases already belong to the album.
export const canRestore = NATIVE && paymentsOn;

export const ALL_PURCHASES: Purchase[] = [
  ...PAID_TIERS.flatMap((tier) => (["month", "year"] as const).map((interval): Purchase => ({ kind: "plan", tier, interval }))),
  ...PACK_ORDER.map((pack): Purchase => ({ kind: "pack", pack })),
];

export type PriceList = Record<string, Price>;

export const LIST_PRICES: PriceList = Object.fromEntries(ALL_PURCHASES.map((p) => [productId(p), listPrice(p)]));

export type BuyResult = "done" | "cancelled" | "off" | "missing";
export type BuyOptions = { email?: string | null; locale?: string };

export type Payments = {
  // Store prices keyed by product id, for whatever the offering has.
  prices(): Promise<Map<string, Price>>;
  buy(purchase: Purchase, accountId: string, opts: BuyOptions): Promise<BuyResult>;
  managementUrl(accountId: string): Promise<string | null>;
  restore(accountId: string): Promise<void>;
};

let impl: Promise<Payments> | null = null;
const load = () => (impl ??= NATIVE ? import("./payments-native").then((m) => m.native(KEY!)) : import("./payments-web").then((m) => m.web(KEY!)));

// The buyer's own prices. All or nothing: a paywall mixing euros and dollars
// is worse than one in dollars, so a half-set-up offering falls back to the
// list prices (and says which products are missing).
export async function storePrices(): Promise<PriceList | null> {
  if (!KEY) return null;
  const found = await (await load()).prices();
  const missing = Object.keys(LIST_PRICES).filter((id) => !found.has(id));
  if (missing.length) {
    console.warn("RevenueCat offering is missing products:", missing.join(", "));
    return null;
  }
  return Object.fromEntries(found);
}

export async function buyWithStore(purchase: Purchase, accountId: string, opts: BuyOptions = {}): Promise<BuyResult> {
  if (!KEY) return "off";
  return (await load()).buy(purchase, accountId, opts);
}

// Where to change or cancel a subscription: RevenueCat's page for web plans,
// the store's subscription settings in the apps. Null when there's none.
export async function managementUrl(accountId: string): Promise<string | null> {
  if (!KEY) return null;
  return (await load()).managementUrl(accountId);
}

// Re-attaches store purchases made on this Apple ID / Google account to the
// album (a reinstall, a new phone). The server then checks what's active.
export async function restoreStorePurchases(accountId: string): Promise<void> {
  if (!KEY) return;
  await (await load()).restore(accountId);
}
