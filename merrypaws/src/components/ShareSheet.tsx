"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { downloadUrl, starName, track, type Portrait } from "@/lib/client";
import { makeShareCard, shareOrSave, type ShareFormat } from "@/lib/share";
import { findStyle } from "@/lib/styles";

const FORMATS: { id: ShareFormat; label: string; hint: string; ratio: string }[] = [
  { id: "story", label: "Story", hint: "9:16, for stories and TikTok", ratio: "aspect-[9/16] w-9" },
  { id: "post", label: "Post", hint: "4:5, for the feed", ratio: "aspect-[4/5] w-12" },
];

export function ShareSheet({ portrait, onClose }: { portrait: Portrait; onClose: () => void }) {
  const [busy, setBusy] = useState<ShareFormat | null>(null);
  const [failed, setFailed] = useState(false);
  const s = findStyle(portrait.style)!;
  const name = starName(portrait.petName);

  async function share(format: ShareFormat) {
    setBusy(format);
    setFailed(false);
    try {
      // Kept portraits share in full quality; previews keep their watermark.
      const src = portrait.unlocked ? downloadUrl(portrait.id) : portrait.preview;
      const blob = await makeShareCard(src, { name, title: s.title, year: s.year, memorial: portrait.memorial }, format);
      const outcome = await shareOrSave(blob, `${name.toLowerCase().replace(/\W+/g, "-")}-${format}.jpg`, `${name} in ${s.title}`);
      if (outcome !== "cancelled") {
        track("share");
        onClose();
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet label="Share" onClose={onClose}>
      <h2 className="font-display text-[1.8rem] leading-tight">Share {name}</h2>
      <p className="mt-1 text-muted">A print on cream paper with its title, ready to post.</p>
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
              <span className="block font-medium">{busy === f.id ? "Making the card" : f.label}</span>
              <span className="text-sm text-muted">{f.hint}</span>
            </span>
          </button>
        ))}
      </div>
      {failed && <p role="alert" className="mt-3 text-accent">That didn&apos;t work. Try again in a moment.</p>}
    </Sheet>
  );
}
