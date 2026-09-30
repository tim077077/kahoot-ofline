"use client";

import { CaretLeft, CaretRight, DownloadSimple, Flag, Heart, ShareNetwork, Trash, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { downloadUrl, starName, type Portrait } from "@/lib/client";
import { findStyle } from "@/lib/styles";

export type ReportReason = "inappropriate" | "not_my_pet" | "other";

type Props = {
  reel: Portrait[];
  openId: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onStar: (id: string) => void;
  onDelete: (id: string) => void;
  onKeep: (p: Portrait) => void;
  onShare: (p: Portrait) => void;
  onReport: (p: Portrait, reason: ReportReason) => Promise<boolean>;
};

type Panel = "none" | "delete" | "report" | "reported";

// One portrait, full screen, with its title card. Swipe or use the arrows to
// move through the album.
export function Viewer({ reel, openId, onClose, onNavigate, onStar, onDelete, onKeep, onShare, onReport }: Props) {
  const index = reel.findIndex((p) => p.id === openId);
  const p = reel[index];
  const [panel, setPanel] = useState<Panel>("none");
  const touchX = useRef<number | null>(null);

  const prev = index > 0 ? reel[index - 1] : null;
  const next = index < reel.length - 1 ? reel[index + 1] : null;

  const go = (id: string) => {
    setPanel("none");
    onNavigate(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prev) onNavigate(prev.id);
      if (e.key === "ArrowRight" && next) onNavigate(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onClose, onNavigate]);

  if (!p) return null;
  const s = findStyle(p.style)!;
  const name = starName(p.petName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} in ${s.title}`}
      className="fixed inset-0 z-40 flex flex-col bg-paper pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx > 60 && prev) go(prev.id);
        if (dx < -60 && next) go(next.id);
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full">
          <X size={24} />
        </button>
        <p className="font-display text-sm italic text-muted">
          {index + 1} of {reel.length}
        </p>
        <button
          onClick={() => onStar(p.id)}
          aria-pressed={p.starred}
          aria-label={p.starred ? "Remove from highlights" : "Add to highlights"}
          className="flex h-11 w-11 items-center justify-center rounded-full"
        >
          <Heart size={24} weight={p.starred ? "fill" : "regular"} className={p.starred ? "text-accent" : ""} />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-8">
        <div key={p.id} className="print rise flex max-h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.preview} alt="" className="max-h-[calc(100dvh-24rem)] w-auto max-w-full object-contain" />
        </div>
        {prev && (
          <button onClick={() => go(prev.id)} aria-label="Previous" className="absolute left-1 hidden h-11 w-11 items-center justify-center rounded-full bg-card sm:flex">
            <CaretLeft size={22} />
          </button>
        )}
        {next && (
          <button onClick={() => go(next.id)} aria-label="Next" className="absolute right-1 hidden h-11 w-11 items-center justify-center rounded-full bg-card sm:flex">
            <CaretRight size={22} />
          </button>
        )}
      </div>

      <div className="px-5 pb-4 pt-4 text-center">
        {p.memorial && <p className="font-display text-sm italic text-muted">In loving memory of</p>}
        <p className="font-script text-[2.6rem] leading-[1.1]">{name}</p>
        <p className="font-display italic">
          in {s.title}, {s.year}
          {p.withOwner ? ", with you" : ""}
        </p>

        {panel === "delete" && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-muted">Remove it from the album?</span>
            <button onClick={() => onDelete(p.id)} className="min-h-11 rounded-full bg-accent px-5 font-medium text-accent-ink">
              Remove
            </button>
            <button onClick={() => setPanel("none")} className="min-h-11 px-3 text-muted">
              Cancel
            </button>
          </div>
        )}
        {panel === "report" && (
          <div className="mt-4">
            <p className="text-muted">What&apos;s wrong with it?</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {(
                [
                  ["not_my_pet", "Doesn't look like them"],
                  ["inappropriate", "Inappropriate"],
                  ["other", "Something else"],
                ] as const
              ).map(([reason, label]) => (
                <button
                  key={reason}
                  onClick={async () => setPanel((await onReport(p, reason)) ? "reported" : "none")}
                  className="min-h-11 rounded-full bg-sand px-4 text-sm"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {panel === "reported" && <p className="mt-4 text-muted">Thank you. We&apos;ll take a look.</p>}

        {panel === "none" && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {p.unlocked ? (
                <a href={downloadUrl(p.id)} download className="flex min-h-13 items-center justify-center gap-2 rounded-full bg-accent font-medium text-accent-ink">
                  <DownloadSimple size={20} weight="bold" /> Save in HD
                </a>
              ) : (
                <button onClick={() => onKeep(p)} className="flex min-h-13 items-center justify-center gap-2 rounded-full bg-accent font-medium text-accent-ink active:scale-[0.98]">
                  <DownloadSimple size={20} weight="bold" /> {p.memorial ? "Keep in HD" : "Save in HD"}
                </button>
              )}
              <button onClick={() => onShare(p)} className="flex min-h-13 items-center justify-center gap-2 rounded-full border border-ink/25 font-medium active:scale-[0.98]">
                <ShareNetwork size={20} /> Share
              </button>
            </div>
            <div className="mt-2 flex justify-center gap-6">
              <button onClick={() => setPanel("delete")} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted">
                <Trash size={16} /> Remove
              </button>
              <button onClick={() => setPanel("report")} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted">
                <Flag size={16} /> Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
