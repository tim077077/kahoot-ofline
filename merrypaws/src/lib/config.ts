// Single place for brand, pricing and limits. Change the name here once you
// pick one for the stores. The reasoning behind every number is in PRICING.md.
export const BRAND = "Paw Pictures";
export const MASCOT = "Biscuit";

// Membership: what holds the album. Everyone can keep an album; the plan sets
// how many photos it holds and what comes with it every month.
export type Tier = "free" | "plus" | "pro";
export type Interval = "month" | "year";

export type TierInfo = {
  id: Tier;
  name: string;
  blurb: string;
  // Photos the album can hold. Going over never deletes anything; it only
  // stops new uploads until the member upgrades or removes some.
  photos: number;
  // Refilled every 30 days while the plan is active. Previews don't roll
  // over; HD portrait credits do.
  previewsPerMonth: number;
  hdPerMonth: number;
  // Every film look, or only the two free ones.
  allLooks: boolean;
  // USD cents. 0 for free.
  price: Record<Interval, number>;
};

export const TIERS: Record<Tier, TierInfo> = {
  free: {
    id: "free",
    name: "Free",
    blurb: "Start their album",
    photos: 30,
    previewsPerMonth: 0,
    hdPerMonth: 0,
    allLooks: false,
    price: { month: 0, year: 0 },
  },
  plus: {
    id: "plus",
    name: "Plus",
    blurb: "Their whole life, kept",
    photos: 1000,
    previewsPerMonth: 20,
    hdPerMonth: 2,
    allLooks: true,
    price: { month: 299, year: 1999 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    blurb: "For the photo-every-day kind of love",
    photos: 10000,
    previewsPerMonth: 40,
    hdPerMonth: 6,
    allLooks: true,
    price: { month: 599, year: 3999 },
  },
};

export const PAID_TIERS: Tier[] = ["plus", "pro"];

// Extra portrait credits, on top of any plan. One credit keeps one portrait
// in HD and adds a few previews to find the right one.
export type PackId = "p3" | "p10" | "p25";
export type Pack = { id: PackId; name: string; credits: number; price: number; blurb: string };

export const PREVIEWS_PER_CREDIT = 3;

export const PACKS: Record<PackId, Pack> = {
  p3: { id: "p3", name: "3 portraits", credits: 3, price: 299, blurb: "Try a few eras" },
  p10: { id: "p10", name: "10 portraits", credits: 10, price: 699, blurb: "Every era, and then some" },
  p25: { id: "p25", name: "25 portraits", credits: 25, price: 1299, blurb: "For every pet in the family" },
};

export const PACK_ORDER: PackId[] = ["p3", "p10", "p25"];

export function formatUsd(cents: number): string {
  const value = cents / 100;
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export const LIMITS = {
  // One free (watermarked) portrait per device, ever. The per-IP daily cap is
  // the backstop for people who clear app data to farm more, and the global
  // cap is your worst-case daily spend (each preview costs about $0.04).
  freePerDevice: Number(process.env.FREE_PER_DEVICE ?? 1),
  freePerIpPerDay: Number(process.env.FREE_PER_IP_PER_DAY ?? 3),
  freeGlobalPerDay: Number(process.env.FREE_GLOBAL_DAILY_CAP ?? 300),
  previewsPerMinute: 4,
  maxUploadBytes: 4 * 1024 * 1024,
  // Album photos are resized on the phone before upload.
  maxPhotoBytes: 3 * 1024 * 1024,
  maxThumbBytes: 400 * 1024,
  // How long a generated portrait can be unlocked and downloaded.
  portraitTtlDays: 30,
};

// The image model, through fal.ai (one key, many models). The fallback runs
// only when the main model errors or times out; it costs more per image, so
// it should be rare. Both are Gemini-family edit models with the same inputs.
export const FAL_MODEL = process.env.FAL_MODEL || "fal-ai/nano-banana/edit";
export const FAL_FALLBACK_MODEL =
  process.env.FAL_FALLBACK_MODEL === undefined ? "fal-ai/gemini-3-pro-image-preview/edit" : process.env.FAL_FALLBACK_MODEL;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
