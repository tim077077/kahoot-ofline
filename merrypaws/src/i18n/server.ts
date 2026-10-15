// Translations for what the server writes itself: the daily reminder and
// the emails. The language comes from the owner's profile (the phone sends
// it), or the request, and falls back to English.

import { DEFAULT_LOCALE, isLocale, translator, type Locale, type Translator } from "./core";
import { loadMessages } from "./load";
import en, { type Messages } from "./messages/en";

export type ServerT = Translator<Messages>;

export async function serverT(locale: unknown): Promise<ServerT> {
  const l: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  try {
    return translator(l, await loadMessages(l), en);
  } catch {
    return translator(DEFAULT_LOCALE, en, en);
  }
}

// "…Named" when there's a name, "…Anon" otherwise.
export function namedS(t: ServerT, base: string, name: string, vars: Record<string, string | number> = {}) {
  const n = name.trim();
  type K = Parameters<ServerT>[0];
  return n ? t(`${base}Named` as K, { ...vars, name: n }) : t(`${base}Anon` as K, vars);
}
