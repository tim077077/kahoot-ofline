import { describe, expect, it } from "vitest";
import { PROMPT_COUNT } from "@/lib/dailyPrompts";
import { fill, LOCALES, matchLocale, pluralForm, translator, type Plural } from "./core";
import { loadMessages } from "./load";
import en from "./messages/en";

// Every language must have every string, with the same {placeholders}, the
// plural forms its grammar needs, and the same number of daily prompts.

const holes = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
const FORMS = new Set(["zero", "one", "two", "few", "many", "other"]);
const isPlural = (v: unknown): v is Plural =>
  typeof v === "object" && v !== null && !Array.isArray(v) && "one" in v && "other" in v && Object.keys(v).every((k) => FORMS.has(k));

// "many" in French, Spanish, Italian and Portuguese is for millions; "other"
// covers it. Polish and Romanian genuinely need their extra forms.
const needed = (locale: string) =>
  new Intl.PluralRules(locale).resolvedOptions().pluralCategories.filter((c) => !(c === "many" && ["fr", "es", "it", "pt"].includes(locale)));

function compare(locale: string, source: unknown, target: unknown, path: string, problems: string[]) {
  if (typeof source === "string") {
    if (typeof target !== "string" || !target.trim()) return void problems.push(`${path}: missing`);
    const want = [...holes(source)].sort().join(",");
    const got = [...holes(target)].sort().join(",");
    if (want !== got) problems.push(`${path}: placeholders {${got}} should be {${want}}`);
    return;
  }
  if (Array.isArray(source)) {
    if (!Array.isArray(target) || target.length !== source.length) return void problems.push(`${path}: needs ${source.length} items`);
    target.forEach((item, i) => typeof item === "string" && item.trim() ? null : problems.push(`${path}[${i}]: empty`));
    return;
  }
  if (isPlural(source)) {
    if (!isPlural(target)) return void problems.push(`${path}: should be a plural`);
    const allowed = new Set(Object.values(source).flatMap((s) => [...holes(s)]));
    allowed.add("n");
    for (const form of needed(locale)) if (!target[form as keyof Plural]) problems.push(`${path}: missing "${form}" form`);
    for (const [form, text] of Object.entries(target)) {
      for (const h of holes(text ?? "")) if (!allowed.has(h)) problems.push(`${path}.${form}: unknown {${h}}`);
    }
    for (const h of holes(source.other)) if (h !== "n" && !holes(target.other).has(h)) problems.push(`${path}.other: missing {${h}}`);
    return;
  }
  const src = source as Record<string, unknown>;
  const tgt = (target ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(src)) compare(locale, src[key], tgt[key], path ? `${path}.${key}` : key, problems);
  for (const key of Object.keys(tgt)) if (!(key in src)) problems.push(`${path ? `${path}.` : ""}${key}: not in English`);
}

describe("translations", () => {
  for (const locale of LOCALES.filter((l) => l !== "en")) {
    it(`${locale} is complete`, async () => {
      const problems: string[] = [];
      compare(locale, en, await loadMessages(locale), "", problems);
      expect(problems).toEqual([]);
    });
  }

  it("has one prompt per day slot", () => {
    expect(en.daily.prompts).toHaveLength(PROMPT_COUNT);
  });
});

describe("translator", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(fill("Hi {name}, {x}", { name: "Luna" })).toBe("Hi Luna, {x}");
  });

  it("picks Polish plural forms", () => {
    const forms = { one: "{n} zdjęcie", few: "{n} zdjęcia", many: "{n} zdjęć", other: "{n} zdjęcia" };
    expect(pluralForm("pl", forms, 1)).toBe("{n} zdjęcie");
    expect(pluralForm("pl", forms, 3)).toBe("{n} zdjęcia");
    expect(pluralForm("pl", forms, 5)).toBe("{n} zdjęć");
    expect(pluralForm("pl", forms, 22)).toBe("{n} zdjęcia");
  });

  it("falls back to English for a missing key and formats numbers the local way", () => {
    const partial = structuredClone(en) as { common: Partial<typeof en.common> };
    delete partial.common.close;
    const t = translator("de", partial as typeof en, en);
    expect(t("common.close")).toBe("Close");
    expect(t.tp("common.photos", 1200)).toBe("1.200 photos");
  });

  it("matches the browser's languages", () => {
    expect(matchLocale(["de-AT", "en"])).toBe("de");
    expect(matchLocale("pt-BR,pt;q=0.9")).toBe("pt");
    expect(matchLocale(["ja", "ko"])).toBe("en");
  });
});
