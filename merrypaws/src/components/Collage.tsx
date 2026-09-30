"use client";

import { FilmStrip, InstagramLogo, Pause, Play, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Polaroid, Print, Tape } from "@/components/Vintage";
import { dateStamp, track, type Photo } from "@/lib/client";
import { findLook, type LookId } from "@/lib/looks";
import { makeCollageCard, shareToInstagramStory } from "@/lib/share";

export type Highlight = { id: string; label: string; caption: string; photos: Photo[] };

// Where each photo lands on the scrapbook page. The pattern repeats every
// seven photos, so a big highlight still reads like a hand-made page.
const LAYOUT = [
  { span: "col-span-4", kind: "polaroid", rotate: -3, tape: "left-[38%] -top-3" },
  { span: "col-span-2 mt-10", kind: "print", rotate: 5, tape: null },
  { span: "col-span-3", kind: "print", rotate: 2, tape: "-left-3 top-3" },
  { span: "col-span-3 mt-6", kind: "print", rotate: -3, tape: "-right-3 top-1" },
  { span: "col-span-6 px-4", kind: "wide", rotate: -1, tape: "left-1/2 -top-3 -translate-x-1/2" },
  { span: "col-span-2 mt-4", kind: "print", rotate: -5, tape: null },
  { span: "col-span-4", kind: "polaroid", rotate: 3, tape: "right-[30%] -top-3" },
] as const;

function yearRange(photos: Photo[]) {
  const years = photos.map((p) => new Date(p.takenAt).getFullYear());
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min} to ${max}`;
}

export function Collage({ highlight, petName, look, onClose, onOpenPhoto }: {
  highlight: Highlight;
  petName: string;
  look: LookId;
  onClose: () => void;
  onOpenPhoto: (id: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const photos = highlight.photos;

  async function share() {
    setSharing(true);
    try {
      const blob = await makeCollageCard(
        photos.slice(0, 5).map((p) => ({ src: p.full, date: p.takenAt })),
        { title: highlight.label, name: petName, filter: findLook(look).filter },
      );
      const outcome = await shareToInstagramStory(blob, `${petName}: ${highlight.label}`);
      if (outcome !== "cancelled") track("story_share");
    } catch {
      // Nothing shared; the page stays as it is.
    } finally {
      setSharing(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={highlight.label} className="paper fixed inset-0 z-40 overflow-y-auto">
      <div className="mx-auto max-w-lg pb-[max(2rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-paper/90 px-3 py-2 backdrop-blur">
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full">
            <X size={24} />
          </button>
          <div className="flex gap-1">
            <button onClick={() => void share()} disabled={sharing} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm disabled:opacity-50">
              <InstagramLogo size={18} /> {sharing ? "Making the page" : "Story"}
            </button>
            <button onClick={() => setPlaying(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper">
              <FilmStrip size={18} /> Play
            </button>
          </div>
        </div>

        <header className="px-6 pt-4 text-center">
          <h1 className="font-script text-[3.6rem] leading-[1.1]">{highlight.label}</h1>
          {highlight.caption && <p className="font-hand mt-1 text-lg leading-normal text-muted">{highlight.caption}</p>}
          <p className="font-display mt-2 italic text-muted">
            starring {petName}, {photos.length} {photos.length === 1 ? "photo" : "photos"}, {yearRange(photos)}
          </p>
        </header>

        <div className="mt-8 grid grid-cols-6 gap-x-4 gap-y-8 px-5">
          {photos.map((p, i) => {
            const slot = LAYOUT[i % LAYOUT.length];
            const common = { src: p.thumb, look, rotate: slot.rotate, alt: p.caption || `${highlight.label}, ${dateStamp(p.takenAt)}` };
            return (
              <button key={p.id} onClick={() => onOpenPhoto(p.id)} className={`drop relative text-left ${slot.span}`} style={{ animationDelay: `${Math.min(i, 8) * 90}ms` }}>
                {slot.kind === "polaroid" ? (
                  <Polaroid {...common} caption={p.caption || new Date(p.takenAt).toLocaleDateString("en", { month: "long", year: "numeric" })} />
                ) : (
                  <Print {...common} date={p.takenAt} aspect={slot.kind === "wide" ? "aspect-[4/3]" : "aspect-[4/5]"} />
                )}
                {slot.tape && <Tape className={slot.tape} rotate={slot.rotate * -2} />}
              </button>
            );
          })}
        </div>
      </div>
      {playing && <Slideshow highlight={highlight} petName={petName} look={look} onClose={() => setPlaying(false)} />}
    </div>
  );
}

const SLIDE_MS = 4200;
const CARD_MS = 2800;

type Frame = { kind: "title" } | { kind: "photo"; photo: Photo } | { kind: "end" };

// The highlight as a little film: title card, each photo with a slow push-in
// and a light leak between them, then THE END.
function Slideshow({ highlight, petName, look, onClose }: { highlight: Highlight; petName: string; look: LookId; onClose: () => void }) {
  const frames: Frame[] = [{ kind: "title" }, ...highlight.photos.map((photo) => ({ kind: "photo" as const, photo })), { kind: "end" }];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const frame = frames[Math.min(i, frames.length - 1)];

  useEffect(() => {
    if (paused || i >= frames.length - 1) return;
    const t = setTimeout(() => setI((v) => v + 1), frame.kind === "photo" ? SLIDE_MS : CARD_MS);
    return () => clearTimeout(t);
  }, [i, paused, frame.kind, frames.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") setPaused((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`${highlight.label}, playing`} className="fixed inset-0 z-50 flex flex-col bg-[#0d0a08] text-[#f3eadb]">
      <div className="h-[8vh] shrink-0" />
      <div className="grain relative flex-1 overflow-hidden">
        {frame.kind === "title" && (
          <div key="title" className="fade-in flex h-full flex-col items-center justify-center px-8 text-center">
            <p className="font-display italic text-[#c2af98]">{petName} in</p>
            <p className="font-script mt-2 text-[4rem] leading-[1.1]">{highlight.label}</p>
            {highlight.caption && <p className="font-hand mt-3 text-lg leading-normal text-[#c2af98]">{highlight.caption}</p>}
          </div>
        )}
        {frame.kind === "photo" && (
          <div key={frame.photo.id} className="fade-in absolute inset-0">
            {/* The same photo, blurred, fills the frame behind it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frame.photo.thumb} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" style={{ filter: `${findLook(look).filter === "none" ? "" : findLook(look).filter} blur(24px)` }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frame.photo.full}
              alt={frame.photo.caption}
              className={`relative h-full w-full object-contain ${paused ? "" : "kenburns"}`}
              style={{ filter: findLook(look).filter }}
            />
            <div className="light-leak" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 pb-6 pt-16 text-center">
              {frame.photo.caption && <p className="font-hand text-xl leading-normal">{frame.photo.caption}</p>}
              <p className="datestamp mt-1 text-sm">{dateStamp(frame.photo.takenAt)}</p>
            </div>
          </div>
        )}
        {frame.kind === "end" && (
          <div key="end" className="fade-in flex h-full flex-col items-center justify-center gap-6">
            <p className="font-display text-5xl italic">The End</p>
            <button onClick={() => setI(0)} className="min-h-11 rounded-full border border-[#f3eadb]/30 px-5 text-sm">
              Play again
            </button>
          </div>
        )}
      </div>
      <div className="flex h-[8vh] min-h-14 shrink-0 items-center justify-between px-4 pb-[env(safe-area-inset-bottom)]">
        <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center">
          <X size={24} />
        </button>
        <div className="flex max-w-[60%] gap-1 overflow-hidden">
          {frames.map((_, j) => (
            <span key={j} className={`h-1 w-3 shrink-0 rounded-full ${j <= i ? "bg-[#e9d8b4]" : "bg-white/20"}`} />
          ))}
        </div>
        <button onClick={() => setPaused((v) => !v)} aria-label={paused ? "Play" : "Pause"} className="flex h-11 w-11 items-center justify-center">
          {paused ? <Play size={22} weight="fill" /> : <Pause size={22} weight="fill" />}
        </button>
      </div>
    </div>
  );
}
