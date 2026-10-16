import type { PurchasesError, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { productId, purchaseFor, type Price } from "./config";
import type { Payments } from "./payments";

// The Android and iOS apps: Google Play and the App Store through RevenueCat's
// Capacitor SDK. Prices come from the store in the buyer's own currency. On
// Google Play a subscription's id is "pp_plus:monthly" (subscription:base
// plan), which purchaseFor reads the same as "pp_plus_monthly".

export function native(apiKey: string): Payments {
  let sdk: Promise<typeof import("@revenuecat/purchases-capacitor")> | null = null;
  let configured: Promise<void> | null = null;
  const load = () => (sdk ??= import("@revenuecat/purchases-capacitor"));

  // Before the album has an account the SDK runs anonymously; it logs in as
  // the album right before a purchase, so the store purchase is the album's.
  async function instance(appUserId?: string) {
    const { Purchases } = await load();
    configured ??= Purchases.configure({ apiKey, appUserID: appUserId ?? null }).catch((err) => {
      configured = null;
      throw err;
    });
    await configured;
    if (appUserId) {
      const { appUserID } = await Purchases.getAppUserID();
      if (appUserID !== appUserId) await Purchases.logIn({ appUserID: appUserId });
    }
    return Purchases;
  }

  let packages: Promise<Map<string, PurchasesPackage>> | null = null;
  function loadPackages() {
    packages ??= instance()
      .then(async (rc) => {
        const offerings = await rc.getOfferings();
        const found = new Map<string, PurchasesPackage>();
        for (const pkg of offerings.current?.availablePackages ?? []) {
          const purchase = purchaseFor(pkg.product.identifier);
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

  return {
    async prices() {
      const found = await loadPackages();
      return new Map(
        [...found].map(([id, pkg]): [string, Price] => [id, { micros: Math.round(pkg.product.price * 1_000_000), currency: pkg.product.currencyCode }]),
      );
    },

    async buy(purchase, accountId, opts) {
      const { PURCHASES_ERROR_CODE } = await load();
      const rc = await instance(accountId);
      const pkg = (await loadPackages()).get(productId(purchase));
      if (!pkg) return "missing";
      if (opts.email) await rc.setEmail({ email: opts.email }).catch(() => {});
      try {
        await rc.purchasePackage({ aPackage: pkg });
        return "done";
      } catch (err) {
        const e = err as Partial<PurchasesError>;
        if (e.userCancelled || e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return "cancelled";
        throw err;
      }
    },

    async managementUrl(accountId) {
      const { customerInfo } = await (await instance(accountId)).getCustomerInfo();
      return customerInfo.managementURL;
    },

    async restore(accountId) {
      await (await instance(accountId)).restorePurchases();
    },
  };
}
