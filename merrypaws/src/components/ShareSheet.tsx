"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { cardText, displayName, styleTitle } from "@/i18n/app";
import { useT } from "@/i18n/react";
import { downloadUrl, track, type Portrait } from "@/lib/client";
import { makeShareCard, shareOrSave, shareToInstagramStory, type ShareFormat } from "@/lib/share";
import { findStyle } from "@/lib/styles";

const FORMATS: { id: ShareFormat; label: "story" | "post"; hint: "storyHint" | "postHint"; ratio: string }[] = [
  { id: "story", label: "story", hint: "storyHint", ratio: "aspect-[9/16] w-9" },
  { id: "post", label: "post", hint: "postHint", ratio: "aspect-[4/5] w-12" },
];

export function ShareSheet({ portrait, onClose }: { portrait: Portrait; onClose: () => void }) {
  const [busy, setBusy] = useState<ShareFormat | null>(null);
  const [failed, setFailed] = useState(false);
  const s = findStyle(portrait.style)!;
  const t = useT();
  const name = displayName(t, portrait.petName);
  const title = styleTitle(t, s.id);

  async function share(format: ShareFormat) {
    setBusy(format);
    setFailed(false);
    try {
      // Kept portraits share in full quality; previews keep their watermark.
      const src = portrait.unlocked ? downloadUrl(portrait.id) : portrait.preview;
      const blob = await makeShareCard(src, { name, title, year: s.year, memorial: portrait.memorial }, format, cardText(t));
      const caption = t("studio.portraitAlt", { name, title });
      const outcome =
        format === "story"
          ? await shareToInstagramStory(blob, caption)
          : await shareOrSave(blob, `${name.toLowerCase().replace(/\W+/g, "-")}-${format}.jpg`, caption);
      if (outcome !== "cancelled") {
        track(format === "story" ? "story_share" : "share");
        onClose();
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet label={t("common.share")} onClose={onClose}>
      <h2 className="font-display text-[1.8rem] leading-tight">{t("shareSheet.titleNamed", { name })}</h2>
      <p className="mt-1 text-muted">{t("shareSheet.body")}</p>
      <div className="mt-5 grid gap-3">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => void share(f.id)}
            disabled={busy !== null}
            className="flex min-h-18 items-center gap-4 rounded-2xl bg-card px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-60"
          >
            <span className="flex w-12 justify-center">
              <span className={`${f.ratio} rounded-[3px] border-2 border-ink/60`} />
            </span>
            <span>
              <span className="block font-medium">{busy === f.id ? t("shareSheet.making") : t(`shareSheet.${f.label}`)}</span>
              <span className="text-sm text-muted">{t(`shareSheet.${f.hint}`)}</span>
            </span>
          </button>
        ))}
      </div>
      {failed && <p role="alert" className="mt-3 text-accent">{t("shareSheet.failed")}</p>}
    </Sheet>
  );
}
