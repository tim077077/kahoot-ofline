"use client";

import { CaretLeft, CaretRight, DownloadSimple, ShareNetwork, Star, Ticket, Trash, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { downloadUrl, type Portrait } from "@/lib/client";
import { findStyle } from "@/lib/styles";

type Props = {
  reel: Portrait[];
  openId: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onStar: (id: string) => void;
  onDelete: (id: string) => void;
  onKeep: (p: Portrait) => void;
};

async function sharePreview(p: Portrait, title: string) {
  try {
    const blob = await (await fetch(p.preview)).blob();
    const file = new File([blob], "portrait.jpg", { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch {
    // Share sheet dismissed or unsupported: fall through to saving.
  }
  const a = document.createElement("a");
  a.href = p.preview;
  a.download = "portrait-preview.jpg";
  a.click();
}

// Full-screen still with its title card. Swipe or use the arrows to move
// along the reel.
export function Viewer({ reel, openId, onClose, onNavigate, onStar, onDelete, onKeep }: Props) {
  const index = reel.findIndex((p) => p.id === openId);
  const p = reel[index];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const touchX = useRef<number | null>(null);

  const prev = index > 0 ? reel[index - 1] : null;
  const next = index < reel.length - 1 ? reel[index + 1] : null;

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
  const star = (p.petName || "Your pet").toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${star} in ${s.title}`}
      className="fixed inset-0 z-40 flex flex-col bg-booth pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx > 60 && prev) onNavigate(prev.id);
        if (dx < -60 && next) onNavigate(next.id);
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-screen">
          <X size={24} />
        </button>
        <p className="font-script text-sm text-silver">
          {index + 1} of {reel.length}
        </p>
        <button
          onClick={() => onStar(p.id)}
          aria-pressed={p.starred}
          aria-label={p.starred ? "Remove from highlights" : "Add to highlights"}
          className="flex h-11 w-11 items-center justify-center rounded-full"
        >
          <Star size={24} weight={p.starred ? "fill" : "regular"} className={p.starred ? "text-stock" : "text-screen"} />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={p.id} src={p.preview} alt="" className="rise max-h-full max-w-full rounded-md object-contain shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]" />
        {prev && (
          <button onClick={() => onNavigate(prev.id)} aria-label="Previous" className="absolute left-1 hidden h-11 w-11 items-center justify-center rounded-full bg-booth/60 sm:flex">
            <CaretLeft size={22} />
          </button>
        )}
        {next && (
          <button onClick={() => onNavigate(next.id)} aria-label="Next" className="absolute right-1 hidden h-11 w-11 items-center justify-center rounded-full bg-booth/60 sm:flex">
            <CaretRight size={22} />
          </button>
        )}
      </div>

      <div className="px-5 pb-4 pt-3 text-center">
        <p className="font-script text-xs text-silver">{star} in</p>
        <p className="font-marquee text-3xl font-extrabold uppercase leading-none">{s.title}</p>
        <p className="font-script mt-0.5 text-xs text-silver">
          {s.year}
          {p.withOwner ? " with co-star" : ""}
        </p>

        {confirmDelete ? (
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-sm text-silver">Delete this take?</span>
            <button onClick={() => onDelete(p.id)} className="min-h-11 rounded-full bg-warn px-4 text-sm font-semibold text-stock-ink">
              Delete
            </button>
            <button onClick={() => setConfirmDelete(false)} className="min-h-11 px-3 text-sm text-silver">
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
            {p.unlocked ? (
              <a
                href={downloadUrl(p.id)}
                download
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-stock font-semibold text-stock-ink"
              >
                <DownloadSimple size={20} weight="bold" /> Save full quality
              </a>
            ) : (
              <button
                onClick={() => onKeep(p)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-stock font-semibold text-stock-ink active:scale-[0.98]"
              >
                <Ticket size={20} weight="bold" /> Keep in full quality
              </button>
            )}
            <button
              onClick={() => void sharePreview(p, `${star} in ${s.title}`)}
              aria-label="Share"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-line"
            >
              <ShareNetwork size={20} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-line"
            >
              <Trash size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
