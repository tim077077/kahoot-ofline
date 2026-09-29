// Single place for brand, pricing and limits. Change the name here once you
// pick a domain.
export const BRAND = "Mobilat";

export const LOCALES = ["ro", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ro";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export type PlanId = "starter" | "agent" | "pro";

export type Plan = {
  id: PlanId;
  credits: number;
  mode: "payment" | "subscription";
  // Amounts in the smallest currency unit (bani / cents).
  price: { ron: number; eur: number };
};

export const PLANS: Record<PlanId, Plan> = {
  starter: { id: "starter", credits: 10, mode: "payment", price: { ron: 2900, eur: 600 } },
  agent: { id: "agent", credits: 50, mode: "payment", price: { ron: 9900, eur: 2000 } },
  pro: { id: "pro", credits: 150, mode: "subscription", price: { ron: 14900, eur: 3000 } },
};

export function currencyFor(locale: Locale): "ron" | "eur" {
  return locale === "ro" ? "ron" : "eur";
}

export function formatPrice(amount: number, currency: "ron" | "eur"): string {
  const value = amount / 100;
  const n = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  // Romanian writes decimals with a comma: 2,90 lei.
  return currency === "ron" ? `${n.replace(".", ",")} lei` : `€${n}`;
}

export const LIMITS = {
  // Free generations per IP per day, and across all visitors per day. The
  // global cap bounds how much free traffic can cost you on a bad day.
  freePerIpPerDay: Number(process.env.FREE_PER_IP_PER_DAY ?? 1),
  freeGlobalPerDay: Number(process.env.FREE_GLOBAL_DAILY_CAP ?? 100),
  maxUploadBytes: 4 * 1024 * 1024,
};

export const FAL_MODEL = process.env.FAL_MODEL || "fal-ai/nano-banana/edit";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
