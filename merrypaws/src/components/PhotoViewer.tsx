"use client";

import { Heart, Plus, ShareNetwork, Trash, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Print } from "@/components/Vintage";
import { ACTIVITIES, activityFor, MAX_TAGS } from "@/lib/activities";
import { track, type Photo } from "@/lib/client";
import type { LookId } from "@/lib/looks";
import { shareOrSave } from "@/lib/share";

type Props = {
  photos: Photo[];
  openId: string;
  look: LookId;
  petName: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<Photo, "tags" | "caption" | "favorite">>) => void;
  onDelete: (id: string) => void;
};

// One photo from the album: the print, what's written on the back, and which
// highlights it belongs to.
export function PhotoViewer({ photos, openId, look, petName, onClose, onNavigate, onUpdate, onDelete }: Props) {
  const index = photos.findIndex((p) => p.id === openId);
  const photo = photos[index];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [custom, setCustom] = useState("");
  const [caption, setCaption] = useState(photo?.caption ?? "");
  const touchX = useRef<number | null>(null);
  const prev = index > 0 ? photos[index - 1] : null;
  const next = index < photos.length - 1 ? photos[index + 1] : null;

  const go = (id: string) => {
    setConfirmDelete(false);
    setCustom("");
    setCaption(photos.find((p) => p.id === id)?.caption ?? "");
    onNavigate(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prev) onNavigate(prev.id);
      if (e.key === "ArrowRight" && next) onNavigate(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onClose, onNavigate]);

  if (!photo) return null;
  const taken = new Date(photo.takenAt);
  const toggleTag = (tag: string) => {
    const has = photo.tags.includes(tag);
    if (!has && photo.tags.length >= MAX_TAGS) return;
    onUpdate(photo.id, { tags: has ? photo.tags.filter((t) => t !== tag) : [...photo.tags, tag] });
  };
  const customTags = photo.tags.filter((t) => !ACTIVITIES.some((a) => a.id === t));

  async function share() {
    try {
      const blob = await (await fetch(photo.full)).blob();
      const outcome = await shareOrSave(blob, `${petName.toLowerCase() || "pet"}-${photo.id.slice(0, 6)}.jpg`, petName);
      if (outcome !== "cancelled") track("share");
    } catch {
      // Share sheet dismissed or the photo couldn't be fetched.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo from ${taken.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}`}
      className="paper fixed inset-0 z-40 overflow-y-auto pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx > 70 && prev) go(prev.id);
        if (dx < -70 && next) go(next.id);
      }}
    >
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between px-3 py-2">
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full">
            <X size={24} />
          </button>
          <p className="font-display text-sm italic text-muted">
            {taken.toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <button
            onClick={() => onUpdate(photo.id, { favorite: !photo.favorite })}
            aria-pressed={photo.favorite}
            aria-label={photo.favorite ? "Remove from favourites" : "Add to favourites"}
            className="flex h-11 w-11 items-center justify-center rounded-full"
          >
            <Heart size={24} weight={photo.favorite ? "fill" : "regular"} className={photo.favorite ? "text-accent" : ""} />
          </button>
        </div>

        <div className="px-10 pt-2">
          <Print
            key={photo.id}
            src={photo.full}
            alt={photo.caption || `${petName}, ${taken.toLocaleDateString()}`}
            look={look}
            date={photo.takenAt}
            rotate={-1}
            aspect={photo.w && photo.h ? "" : "aspect-[4/5]"}
            imgClassName={photo.w && photo.h ? "max-h-[52dvh] object-contain" : ""}
            className="rise"
          />
        </div>

        <div className="px-6 pt-6">
          <label htmlFor="caption" className="sr-only">
            Caption
          </label>
          <input
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 80))}
            onBlur={() => caption !== photo.caption && onUpdate(photo.id, { caption })}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="Write something on the back"
            className="font-hand w-full border-b border-dashed border-line bg-transparent py-2 text-center text-lg leading-normal outline-none placeholder:text-muted/70 focus:border-accent"
          />

          <h2 className="font-display mt-6 text-center italic">What were they up to?</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {[...ACTIVITIES.map((a) => a.id), ...customTags].map((tag) => {
              const on = photo.tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={on}
                  className={on ? "dymo min-h-9" : "min-h-9 rounded-[3px] border border-dashed border-ink/30 px-2.5 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-muted"}
                >
                  {activityFor(tag).label}
                </button>
              );
            })}
          </div>
          <form
            className="mx-auto mt-3 flex max-w-xs gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const tag = custom.trim();
              if (tag && !photo.tags.includes(tag) && photo.tags.length < MAX_TAGS) onUpdate(photo.id, { tags: [...photo.tags, tag] });
              setCustom("");
            }}
          >
            <label htmlFor="custom-tag" className="sr-only">
              Your own highlight
            </label>
            <input
              id="custom-tag"
              value={custom}
              onChange={(e) => setCustom(e.target.value.slice(0, 24))}
              placeholder="Your own, like Grandma's house"
              className="min-h-11 flex-1 rounded-full border border-line bg-card px-4 text-sm outline-none focus:border-accent"
            />
            <button type="submit" aria-label="Add highlight" className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-paper">
              <Plus size={18} weight="bold" />
            </button>
          </form>

          {confirmDelete ? (
            <div className="mt-8 flex items-center justify-center gap-3 pb-6">
              <span className="text-muted">Remove this photo?</span>
              <button onClick={() => onDelete(photo.id)} className="min-h-11 rounded-full bg-accent px-5 font-medium text-accent-ink">
                Remove
              </button>
              <button onClick={() => setConfirmDelete(false)} className="min-h-11 px-3 text-muted">
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-8 flex justify-center gap-6 pb-6">
              <button onClick={() => void share()} className="inline-flex min-h-11 items-center gap-1.5 text-muted">
                <ShareNetwork size={18} /> Share
              </button>
              <button onClick={() => setConfirmDelete(true)} className="inline-flex min-h-11 items-center gap-1.5 text-muted">
                <Trash size={18} /> Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
