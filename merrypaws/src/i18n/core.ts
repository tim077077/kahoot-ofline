// Translations: the pieces that work the same on the phone and the server.
//
// Every string the app shows lives in src/i18n/messages/<locale>.ts. English
// is the source; every other catalog must have exactly the same keys (the
// type system and a test both check), so nothing ships half-translated.
//
// Messages use {name}-style placeholders. Counts use plural forms picked by
// Intl.PluralRules, because "1 photo / 2 photos" is not how Polish or
// Romanian count (Polish has one, few and many).

export const LOCALES = ["en", "de", "fr", "es", "it", "nl", "pl", "pt", "ro"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

// Each language in its own name, for the picker.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
  ro: "Română",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// The first supported language in a preference list such as
// navigator.languages or an Accept-Language header ("de-AT,de;q=0.9,en").
export function matchLocale(preferences: readonly string[] | string | null | undefined): Locale {
  const list = typeof preferences === "string" ? preferences.split(",").map((p) => p.split(";")[0]) : (preferences ?? []);
  for (const pref of list) {
    const base = pref.trim().toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export type Plural = { one: string; other: string; zero?: string; two?: string; few?: string; many?: string };

// The shape every catalog must match: English's keys, with any wording.
export type Catalog<T> = T extends Plural
  ? Plural
  : T extends string
    ? string
    : T extends readonly string[]
      ? string[]
      : { [K in keyof T]: Catalog<T[K]> };

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
// Dotted keys to plain strings ("studio.develop") and to plural forms.
export type TextKey<T> = {
  [K in keyof T & string]: T[K] extends string ? K : T[K] extends Plural | readonly string[] ? never : Join<K, TextKey<T[K]>>;
}[keyof T & string];
export type PluralKey<T> = {
  [K in keyof T & string]: T[K] extends Plural ? K : T[K] extends string | readonly string[] ? never : Join<K, PluralKey<T[K]>>;
}[keyof T & string];
export type ListKey<T> = {
  [K in keyof T & string]: T[K] extends readonly string[] ? K : T[K] extends string | Plural ? never : Join<K, ListKey<T[K]>>;
}[keyof T & string];

export type Vars = Record<string, string | number>;

export function lookup(messages: unknown, key: string): unknown {
  let node = messages;
  for (const part of key.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
  return node;
}

// "{n} photos" with { n: 3 } -> "3 photos". Unknown placeholders stay
// visible, so a mistake shows up on screen instead of vanishing.
export function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

const rules = new Map<Locale, Intl.PluralRules>();
export function pluralForm(locale: Locale, forms: Plural, n: number): string {
  if (n === 0 && forms.zero) return forms.zero;
  let pr = rules.get(locale);
  if (!pr) rules.set(locale, (pr = new Intl.PluralRules(locale)));
  const form = pr.select(n) as keyof Plural;
  return forms[form] ?? forms.other;
}

// Callable: t("studio.develop") is the same as t.t("studio.develop").
export type Translator<M> = ((key: TextKey<M>, vars?: Vars) => string) & {
  locale: Locale;
  t: (key: TextKey<M>, vars?: Vars) => string;
  // Plural: picks the form for n; {n} is filled in automatically.
  tp: (key: PluralKey<M>, n: number, vars?: Vars) => string;
  list: (key: ListKey<M>) => string[];
  // Dates and numbers in the reader's own format.
  date: (value: string | number | Date, options: Intl.DateTimeFormatOptions) => string;
  number: (n: number) => string;
};

export function translator<M>(locale: Locale, messages: M, fallback: M): Translator<M> {
  const get = (key: string) => lookup(messages, key) ?? lookup(fallback, key);
  const nf = new Intl.NumberFormat(locale);
  // Keys are checked at the call sites (the Translator type); inside, they're plain strings.
  const t = (key: string, vars?: Vars) => {
    const value = get(key);
    return typeof value === "string" ? fill(value, vars) : key;
  };
  const self = Object.assign(t, {
    locale,
    t,
    tp: (key: string, n: number, vars?: Vars) => {
      const value = get(key) as Plural | undefined;
      return value ? fill(pluralForm(locale, value, n), { n: nf.format(n), ...vars }) : key;
    },
    list: (key: string) => {
      const value = get(key);
      return Array.isArray(value) ? (value as string[]) : [];
    },
    date: (value: string | number | Date, options: Intl.DateTimeFormatOptions) => new Date(value).toLocaleDateString(locale, options),
    number: (n: number) => nf.format(n),
  });
  return self as unknown as Translator<M>;
}
