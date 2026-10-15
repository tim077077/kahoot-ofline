// Loading a language's catalog, on the phone or the server. English is
// bundled; the others are separate chunks fetched only when needed.

import type { Catalog, Locale } from "./core";
import en, { type Messages } from "./messages/en";

const loaders: Record<Exclude<Locale, "en">, () => Promise<{ default: Catalog<Messages> }>> = {
  de: () => import("./messages/de"),
  fr: () => import("./messages/fr"),
  es: () => import("./messages/es"),
  it: () => import("./messages/it"),
  nl: () => import("./messages/nl"),
  pl: () => import("./messages/pl"),
  pt: () => import("./messages/pt"),
  ro: () => import("./messages/ro"),
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") return en;
  return (await loaders[locale]()).default as Messages;
}
