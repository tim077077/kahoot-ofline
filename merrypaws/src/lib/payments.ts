import type { Package, Purchases } from "@revenuecat/purchases-js";
import { listPrice, PACK_ORDER, PAID_TIERS, productId, purchaseFor, type Price, type Purchase } from "./config";

// Payments in the browser: RevenueCat Web Billing. RevenueCat holds the
// prices per country (euros in the eurozone, złoty in Poland...), shows its own
// checkout over the page, and tells the server through /api/revenuecat. The
// store apps will do the same with the Capacitor SDK and the same product IDs.
//
// The SDK loads only when someone opens a paywall.

const KEY = process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY;
export const paymentsOn = Boolean(KEY);

export const ALL_PURCHASES: Purchase[] = [
  ...PAID_TIERS.flatMap((tier) => (["month", "year"] as const).map((interval): Purchase => ({ kind: "plan", tier, interval }))),
  ...PACK_ORDER.map((pack): Purchase => ({ kind: "pack", pack })),
];

export type PriceList = Record<string, Price>;

export const LIST_PRICES: PriceList = Object.fromEntries(ALL_PURCHASES.map((p) => [productId(p), listPrice(p)]));

let sdk: Promise<typeof import("@revenuecat/purchases-js")> | null = null;
const load = () => (sdk ??= import("@revenuecat/purchases-js"));

// Before the album has an account the prices load as an anonymous visitor;
// the purchase itself always runs as the album's account.
async function instance(appUserId?: string): Promise<Purchases> {
  const { Purchases } = await load();
  if (!Purchases.isConfigured()) {
    return Purchases.configure({ apiKey: KEY!, appUserId: appUserId ?? Purchases.generateRevenueCatAnonymousAppUserId() });
  }
  const rc = Purchases.getSharedInstance();
  if (appUserId && rc.getAppUserId() !== appUserId) await rc.changeUser(appUserId);
  return rc;
}

let packages: Promise<Map<string, Package>> | null = null;

function loadPackages(appUserId?: string) {
  packages ??= instance(appUserId)
    .then(async (rc) => {
      const offerings = await rc.getOfferings();
      const found = new Map<string, Package>();
      for (const pkg of offerings.current?.availablePackages ?? []) {
        const purchase = purchaseFor(pkg.webBillingProduct.identifier);
        if (purchase) found.set(productId(purchase), pkg);
      }
      return found;
    })
    .catch((err) => {
      packages = null;
      throw err;
    });
  return packages;
}

// The buyer's own prices. All or nothing: a paywall mixing euros and dollars
// is worse than one in dollars, so a half-set-up offering falls back to the
// list prices (and says which products are missing).
export async function storePrices(): Promise<PriceList | null> {
  if (!KEY) return null;
  const found = await loadPackages();
  const missing = Object.keys(LIST_PRICES).filter((id) => !found.has(id));
  if (missing.length) {
    console.warn("RevenueCat offering is missing products:", missing.join(", "));
    return null;
  }
  return Object.fromEntries(
    [...found].map(([id, pkg]) => [id, { micros: pkg.webBillingProduct.currentPrice.amountMicros, currency: pkg.webBillingProduct.currentPrice.currency }]),
  );
}

export type BuyResult = "done" | "cancelled" | "off" | "missing";

export async function buyWithStore(purchase: Purchase, accountId: string, opts: { email?: string | null; locale?: string } = {}): Promise<BuyResult> {
  if (!KEY) return "off";
  const { ErrorCode, PurchasesError } = await load();
  const rc = await instance(accountId);
  const pkg = (await loadPackages(accountId)).get(productId(purchase));
  if (!pkg) return "missing";
  try {
    await rc.purchase({ rcPackage: pkg, customerEmail: opts.email ?? undefined, selectedLocale: opts.locale });
    return "done";
  } catch (err) {
    if (err instanceof PurchasesError && err.errorCode === ErrorCode.UserCancelledError) return "cancelled";
    throw err;
  }
}

// RevenueCat's page for changing or cancelling a web subscription. Store
// subscribers get null and manage theirs in App Store or Google Play settings.
export async function managementUrl(accountId: string): Promise<string | null> {
  if (!KEY) return null;
  const info = await (await instance(accountId)).getCustomerInfo();
  return info.managementURL;
}
