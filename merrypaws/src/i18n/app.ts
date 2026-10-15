// Small helpers that turn the app's ids (activities, looks, styles, tiers)
// into words in the reader's language. Custom tags the owner typed stay as typed.

import { ACTIVITIES } from "@/lib/activities";
import { BRAND, type Price } from "@/lib/config";
import type { CardWords } from "@/lib/share";
import type { TextKey } from "./core";
import type { Messages } from "./messages/en";
import type { T } from "./react";

const known = new Set(ACTIVITIES.map((a) => a.id));
type K = TextKey<Messages>;

export function activityText(t: T, tag: string): { label: string; caption: string } {
  if (!known.has(tag)) return { label: tag, caption: "" };
  return { label: t(`activities.${tag}.label` as K), caption: t(`activities.${tag}.caption` as K) };
}

export const lookLabel = (t: T, id: string) => t(`looks.${id}` as K);
export const styleTitle = (t: T, id: string) => t(`styles.${id}.title` as K);
export const styleBlurb = (t: T, id: string) => t(`styles.${id}.blurb` as K);
export const tierName = (t: T, tier: string) => t(`plans.tiers.${tier}.name` as K);
export const tierBlurb = (t: T, tier: string) => t(`plans.tiers.${tier}.blurb` as K);

// The pet's name, or null when the owner hasn't given one. Screens pick the
// "…Named" or "…Anon" sentence from this, instead of gluing words together.
export const petName = (name: string | null | undefined) => name?.trim() || null;
export const displayName = (t: T, name: string | null | undefined) => petName(name) ?? t("common.yourPet");

// "…Named" when there's a name, "…Anon" otherwise.
export function named(t: T, base: string, name: string | null | undefined, vars: Record<string, string | number> = {}) {
  const n = petName(name);
  return n ? t(`${base}Named` as K, { ...vars, name: n }) : t(`${base}Anon` as K, vars);
}

// Prices in the currency the store charges, written the reader's way
// ("4,99 €" in German, "€4.99" in Irish English). Whole amounts drop the
// decimals ("30 €").
export function money(locale: string, price: Price, scale = 1): string {
  const amount = price.micros / 1_000_000 / scale;
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  return new Intl.NumberFormat(locale, { style: "currency", currency: price.currency, ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}) }).format(
    amount,
  );
}

export function hourText(locale: string, h: number): string {
  return new Date(2000, 0, 1, h).toLocaleTimeString(locale, { hour: "numeric" });
}

// Words drawn onto share cards.
export function cardText(t: T): CardWords {
  return {
    memorial: t("cards.memorial"),
    titleCard: (title, year) => t("studio.titleCard", { title, year }),
    madeWith: t("cards.madeWith", { brand: BRAND }).toUpperCase(),
    rollDay: (n) => t("cards.rollDay", { n }),
    starring: (name) => t("cards.starring", { name }),
  };
}
