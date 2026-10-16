import type { Package, Purchases } from "@revenuecat/purchases-js";
import { productId, purchaseFor, type Price } from "./config";
import type { Payments } from "./payments";

// RevenueCat Web Billing: RevenueCat holds the prices per country (euros in
// the eurozone, złoty in Poland...) and shows its own checkout over the page.

export function web(apiKey: string): Payments {
  let sdk: Promise<typeof import("@revenuecat/purchases-js")> | null = null;
  const load = () => (sdk ??= import("@revenuecat/purchases-js"));

  // Before the album has an account the prices load as an anonymous visitor;
  // the purchase itself always runs as the album's account.
  async function instance(appUserId?: string): Promise<Purchases> {
    const { Purchases } = await load();
    if (!Purchases.isConfigured()) {
      return Purchases.configure({ apiKey, appUserId: appUserId ?? Purchases.generateRevenueCatAnonymousAppUserId() });
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

  return {
    async prices() {
      const found = await loadPackages();
      return new Map(
        [...found].map(([id, pkg]): [string, Price] => [
          id,
          { micros: pkg.webBillingProduct.currentPrice.amountMicros, currency: pkg.webBillingProduct.currentPrice.currency },
        ]),
      );
    },

    async buy(purchase, accountId, opts) {
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
    },

    async managementUrl(accountId) {
      const info = await (await instance(accountId)).getCustomerInfo();
      return info.managementURL;
    },

    async restore() {},
  };
}
