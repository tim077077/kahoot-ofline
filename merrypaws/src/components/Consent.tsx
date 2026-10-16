"use client";

import { Sheet } from "@/components/Sheet";
import { LegalLinks } from "@/components/Legal";
import { useT } from "@/i18n/react";

// Asked once per phone, right before the first portrait: the photo leaves the
// album for Google's AI, so people say yes to that first.
export function ConsentSheet({ onAnswer }: { onAnswer: (ok: boolean) => void }) {
  const t = useT();
  return (
    <Sheet label={t("consent.title")} onClose={() => onAnswer(false)}>
      <h2 className="font-display text-[1.8rem] leading-tight">{t("consent.title")}</h2>
      <p className="mt-2">{t("consent.body")}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>{t("consent.onlyThis")}</li>
        <li>{t("consent.noTraining")}</li>
        <li>{t("consent.people")}</li>
      </ul>
      <button onClick={() => onAnswer(true)} className="mt-6 min-h-13 w-full rounded-full bg-accent font-medium text-accent-ink active:scale-[0.98]">
        {t("consent.agree")}
      </button>
      <button onClick={() => onAnswer(false)} className="mt-1 min-h-12 w-full text-muted underline underline-offset-4">
        {t("consent.notNow")}
      </button>
      <LegalLinks className="mt-2" />
    </Sheet>
  );
}
