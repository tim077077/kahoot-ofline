// Single place for brand, pricing and limits. Change the name here once you
// pick one for the stores. The reasoning behind every number is in PRICING.md.
export const BRAND = "Paw Pictures";
export const MASCOT = "Biscuit";

// Membership: what holds the album. Everyone can keep an album; the plan sets
// how many photos it holds and what comes with it every month.
//
// Three paid plans, shown most expensive first (the anchor), with Plus in the
// middle, highlighted and preselected. Plus is the one we want people on: a
// portrait every day for less than a coffee a month. See PSYCHOLOGY.md.
export type Tier = "free" | "starter" | "plus" | "pro";
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
  // Streak freezes granted each month (they cover a missed day).
  freezesPerMonth: number;
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
    // Room for the first page (up to 12) plus more than a month of photos of
    // the day, so the upgrade question comes after the habit, not before it.
    photos: 50,
    previewsPerMonth: 0,
    hdPerMonth: 0,
    freezesPerMonth: 1,
    allLooks: false,
    price: { month: 0, year: 0 },
  },
  starter: {
    id: "starter",
    name: "Starter",
    blurb: "A bigger album",
    photos: 300,
    previewsPerMonth: 10,
    hdPerMonth: 5,
    freezesPerMonth: 2,
    allLooks: true,
    price: { month: 299, year: 1999 },
  },
  plus: {
    id: "plus",
    name: "Plus",
    blurb: "A portrait every day",
    photos: 2000,
    // One try a day, and every one of them can be kept in HD.
    previewsPerMonth: 30,
    hdPerMonth: 30,
    freezesPerMonth: 4,
    allLooks: true,
    price: { month: 399, year: 2999 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    blurb: "For the photo-every-hour kind of love",
    photos: 10000,
    previewsPerMonth: 60,
    hdPerMonth: 60,
    freezesPerMonth: 4,
    allLooks: true,
    price: { month: 799, year: 6999 },
  },
};

// Display order: the anchor first, the target in the middle.
export const PAID_TIERS: Tier[] = ["pro", "plus", "starter"];
export const TARGET_TIER: Tier = "plus";

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

// What one portrait try costs us: Gemini Nano Banana 2.1 at 1K is $0.0336 an
// image, plus about $0.003 for the photo and prompt going in. HD unlocks cost
// nothing (the image already exists). plans.test.ts fails if any plan or pack
// could lose money at this price, even with a 30% store fee and every try used.
export const COST_PER_TRY_USD = 0.037;

export const LIMITS = {
  // One free (watermarked) portrait per device, ever. The per-IP daily cap is
  // the backstop for people who clear app data to farm more, and the global
  // cap is your worst-case daily spend (each preview costs COST_PER_TRY_USD).
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

// The image model, called directly on Google's Gemini API (GEMINI_API_KEY).
// The fallback runs only when the main model errors or times out.
export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";
export const GEMINI_FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL === undefined ? "gemini-3.1-flash-image" : process.env.GEMINI_FALLBACK_MODEL;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
