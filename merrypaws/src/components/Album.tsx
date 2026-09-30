"use client";

import { FilmStrip, Heart, Plus } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { Highlight } from "@/components/Collage";
import { Mascot } from "@/components/Mascot";
import { MonthHeading, Print, Stack } from "@/components/Vintage";
import { activityFor } from "@/lib/activities";
import { starName, type Account, type Photo, type Portrait } from "@/lib/client";
import { TIERS } from "@/lib/config";
import { findLook, type LookId } from "@/lib/looks";

export type Pending = { key: string; url: string; progress: "waiting" | "uploading" | "failed" };

type Props = {
  petName: string;
  photos: Photo[];
  pending: Pending[];
  portraits: Portrait[];
  look: LookId;
  account: Account | null;
  onAdd: () => void;
  onLook: () => void;
  onOpenPhoto: (id: string) => void;
  onOpenHighlight: (h: Highlight) => void;
  onOpenPortraits: () => void;
  onPlans: () => void;
  // The photo-of-the-day card and today's memory, above the highlights.
  top?: ReactNode;
  dailyPhotoIds?: string[];
};

// Favourites first, then every activity by how much of their life it fills.
export function buildHighlights(photos: Photo[], dailyIds: string[] = []): Highlight[] {
  const out: Highlight[] = [];
  const daily = new Set(dailyIds);
  const roll = photos.filter((p) => daily.has(p.id));
  if (roll.length >= 2) out.push({ id: "roll", label: "Photo a day", caption: "One a day, every day", photos: roll });
  const favourites = photos.filter((p) => p.favorite);
  if (favourites.length) out.push({ id: "favourites", label: "Favourites", caption: "The ones we love most", photos: favourites });
  const byTag = new Map<string, Photo[]>();
  for (const p of photos) for (const t of p.tags) byTag.set(t, [...(byTag.get(t) ?? []), p]);
  [...byTag.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([tag, list]) => {
      const a = activityFor(tag);
      out.push({ id: tag, label: a.label, caption: a.caption, photos: list });
    });
  return out;
}

// Month pages once the album is full enough; until then, one page a year, so
// a young album doesn't look empty.
function groupPages(photos: Photo[]) {
  const byMonth = photos.length >= 40;
  const groups: { key: string; date: string; photos: Photo[] }[] = [];
  for (const p of photos) {
    const key = p.takenAt.slice(0, byMonth ? 7 : 4);
    const last = groups.at(-1);
    if (last?.key === key) last.photos.push(p);
    else groups.push({ key, date: p.takenAt, photos: [p] });
  }
  return groups;
}

const TURNS = [-1.5, 1.2, -0.6, 0.8, -1, 1.6];

export function Album(props: Props) {
  const { photos, pending, portraits, look, account } = props;
  const name = starName(props.petName);
  const highlights = buildHighlights(photos, props.dailyPhotoIds);
  const since = photos.length ? new Date(photos.at(-1)!.takenAt).getFullYear() : null;

  if (photos.length === 0 && pending.length === 0) {
    return (
      <section className="flex min-h-[72dvh] flex-col items-center justify-center px-8 text-center">
        <Mascot size={120} />
        <h1 className="font-display mt-6 text-[2rem] leading-tight">{name === "Your pet" ? "Their album" : `${name}'s album`} is waiting</h1>
        <p className="mt-2 max-w-[30ch] text-muted">Add your favourite photos and they&apos;ll be kept here like prints in an old family album.</p>
        <button onClick={props.onAdd} className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-full bg-accent px-8 text-lg font-medium text-accent-ink active:scale-[0.98]">
          <Plus size={20} weight="bold" /> Add photos
        </button>
      </section>
    );
  }

  const limit = account?.photoLimit ?? TIERS.free.photos;
  const used = account?.photos ?? photos.length;

  return (
    <section className="pb-12 pt-1">
      <div className="flex items-end justify-between gap-3 px-5">
        <div>
          <p className="font-script text-[2.4rem] leading-[1.05]">{name === "Your pet" ? "The" : `${name}'s`}</p>
          <h1 className="font-display -mt-1 text-[2.6rem] leading-none">Album</h1>
          <p className="font-hand mt-2 text-base leading-normal text-muted">
            {photos.length} {photos.length === 1 ? "memory" : "memories"}
            {since ? ` since ${since}` : ""}
          </p>
        </div>
        <button onClick={props.onLook} className="mb-1 inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 px-4 text-sm">
          <FilmStrip size={18} /> {findLook(look).label}
        </button>
      </div>

      {props.top}

      <div className="mt-7 flex snap-x scroll-px-5 gap-4 overflow-x-auto px-5 pb-2" role="list" aria-label="Highlights">
        {portraits.length > 0 && (
          <button role="listitem" onClick={props.onOpenPortraits} className="w-28 shrink-0 snap-start text-center">
            <Stack srcs={portraits.slice(0, 3).map((p) => p.preview)} label="Portraits" />
            <span className="dymo mt-1 !px-2 !text-[0.7rem] !tracking-[0.1em]" data-tone="red">
              Portraits
            </span>
          </button>
        )}
        {highlights.map((h) => (
          <button role="listitem" key={h.id} onClick={() => props.onOpenHighlight(h)} className="w-28 shrink-0 snap-start text-center">
            <Stack srcs={h.photos.slice(0, 3).map((p) => p.thumb)} look={look} label={h.label} />
            <span className="dymo mt-1 max-w-full truncate !px-2 !text-[0.7rem] !tracking-[0.1em]">{h.label}</span>
          </button>
        ))}
        {highlights.length === 0 && (
          <p role="listitem" className="flex min-h-24 flex-1 items-center gap-3 rounded-2xl bg-card p-4 text-sm text-muted">
            <Heart size={22} className="shrink-0 text-accent" />
            Open a photo and tag what {name === "Your pet" ? "they" : name} were up to. Walks, naps, birthdays: each becomes a collage here.
          </p>
        )}
      </div>

      {pending.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-6 px-5">
          {pending.map((p) => (
            <div key={p.key} className="relative">
              <Print src={p.url} imgClassName={p.progress === "failed" ? "opacity-40" : "negative"} />
              <span className="absolute inset-x-0 bottom-2 text-center text-xs font-medium text-[#fbf8f2] drop-shadow">
                {p.progress === "failed" ? "Didn't upload" : "Developing"}
              </span>
            </div>
          ))}
        </div>
      )}

      {groupPages(photos).map((group) => (
        <div key={group.key} className="mt-9">
          <MonthHeading date={group.date} yearOnly={group.key.length === 4} />
          <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-5 px-5">
            {group.photos.map((p, i) => (
              <button key={p.id} onClick={() => props.onOpenPhoto(p.id)} className="relative" aria-label={p.caption || `Photo from ${new Date(p.takenAt).toLocaleDateString()}`}>
                <Print src={p.thumb} look={look} rotate={TURNS[i % TURNS.length]} />
                {p.favorite && <Heart size={16} weight="fill" className="absolute right-1.5 top-1.5 text-[#fbf8f2] drop-shadow" aria-hidden />}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={props.onPlans} className="mx-5 mt-12 flex w-[calc(100%-2.5rem)] items-center justify-between gap-3 border-y border-dashed border-line py-4 text-left">
        <span>
          <span className="block text-sm text-muted">
            {used} of {limit.toLocaleString()} photos, {TIERS[account?.tier ?? "free"].name}
          </span>
          <span className="mt-1.5 block h-1.5 w-40 overflow-hidden rounded-full bg-sand">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
          </span>
        </span>
        {account?.tier === "free" || !account ? <span className="font-medium text-accent">Make room</span> : null}
      </button>

      <button
        onClick={props.onAdd}
        aria-label="Add photos"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_12px_24px_-10px_var(--shadow)] active:scale-95"
      >
        <Plus size={26} weight="bold" />
      </button>
    </section>
  );
}
