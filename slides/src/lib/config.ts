// Single place for brand, pricing and limits. Change the name here once you
// pick a domain.
export const BRAND = "SlideDrop";

export const PRO = {
  // USD cents per month.
  price: 900,
  // Fair-use cap on AI writes per day for Pro accounts.
  aiPerDay: 200,
};

export function formatUsd(cents: number): string {
  const value = cents / 100;
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export const LIMITS = {
  // Free AI writes per IP per day, and across all free users per day. One
  // write costs roughly a couple of cents; the global cap bounds a bad day.
  freePerIpPerDay: Number(process.env.FREE_PER_IP_PER_DAY ?? 3),
  freeGlobalPerDay: Number(process.env.FREE_GLOBAL_DAILY_CAP ?? 500),
  maxSlides: 10,
  maxTopicChars: 200,
};

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
