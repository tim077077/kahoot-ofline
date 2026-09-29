// Single place for brand, pricing and limits. Change the name here once you
// pick a domain.
export const BRAND = "Merry Paws";

export type PlanId = "single" | "trio" | "family";

export type Plan = {
  id: PlanId;
  name: string;
  credits: number;
  // USD cents.
  price: number;
  blurb: string;
};

export const PLANS: Record<PlanId, Plan> = {
  single: { id: "single", name: "One portrait", credits: 1, price: 1900, blurb: "Perfect for a card or a phone wallpaper" },
  trio: { id: "trio", name: "Three portraits", credits: 3, price: 2900, blurb: "Try a few looks, keep your favourites" },
  family: { id: "family", name: "Eight portraits", credits: 8, price: 4900, blurb: "For every pet in the family, or gifts" },
};

export const PLAN_ORDER: PlanId[] = ["single", "trio", "family"];

export function formatUsd(cents: number): string {
  const value = cents / 100;
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export const LIMITS = {
  // Free previews per IP per day, and across everyone per day. Each preview
  // costs about $0.04, so the global cap is your worst-case daily spend.
  freePerIpPerDay: Number(process.env.FREE_PER_IP_PER_DAY ?? 3),
  freeGlobalPerDay: Number(process.env.FREE_GLOBAL_DAILY_CAP ?? 300),
  // Buyers get extra previews to find the look they want.
  buyerPerDay: 30,
  maxUploadBytes: 4 * 1024 * 1024,
  // How long a generated portrait can be unlocked and downloaded.
  portraitTtlDays: 30,
};

export const FAL_MODEL = process.env.FAL_MODEL || "fal-ai/nano-banana/edit";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
