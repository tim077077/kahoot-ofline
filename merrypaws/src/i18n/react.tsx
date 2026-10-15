"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, isLocale, matchLocale, translator, type Locale, type Translator } from "./core";
import { loadMessages } from "./load";
import en, { type Messages } from "./messages/en";

// The language on the phone: picked from the browser on first open, then
// whatever the owner chooses in Membership. English ships with the app; the
// others load only when someone needs them.

const STORAGE_KEY = "pp_locale";


export type T = Translator<Messages>;
type Ctx = T & { setLocale: (locale: Locale) => void };

const I18nContext = createContext<Ctx | null>(null);

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {}
  return typeof navigator === "undefined" ? DEFAULT_LOCALE : matchLocale(navigator.languages ?? [navigator.language]);
}

// Renders nothing until the language is known and loaded, which on a repeat
// visit is a single tick: no flash of English before German.
export function I18nProvider({ children, onChange }: { children: ReactNode; onChange?: (locale: Locale) => void }) {
  const [state, setState] = useState<{ locale: Locale; messages: Messages } | null>(null);

  const apply = useCallback((locale: Locale) => {
    let cancelled = false;
    loadMessages(locale)
      .catch(() => {
        locale = DEFAULT_LOCALE;
        return en;
      })
      .then((messages) => {
        if (cancelled) return;
        document.documentElement.lang = locale;
        setState({ locale, messages });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => apply(initialLocale()), [apply]);

  const setLocale = useCallback(
    (locale: Locale) => {
      try {
        localStorage.setItem(STORAGE_KEY, locale);
      } catch {}
      apply(locale);
      onChange?.(locale);
    },
    [apply, onChange],
  );

  const value = useMemo<Ctx | null>(
    () => (state ? Object.assign(translator(state.locale, state.messages, en), { setLocale }) : null),
    [state, setLocale],
  );

  if (!value) return null;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT outside I18nProvider");
  return ctx;
}
