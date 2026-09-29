"use client";

import { Play, Star } from "@phosphor-icons/react";
import { useState } from "react";
import { Mascot } from "@/components/Mascot";
import type { Portrait } from "@/lib/client";
import { findStyle, STYLES, type StyleId } from "@/lib/styles";

type Props = {
  reel: Portrait[];
  onOpen: (id: string) => void;
  onPremiere: () => void;
  onStudio: () => void;
};

// The contact sheet: every take on this phone, highlights first.
export function Reel({ reel, onOpen, onPremiere, onStudio }: Props) {
  const [filter, setFilter] = useState<StyleId | "all">("all");
  const highlights = reel.filter((p) => p.starred);
  const films = STYLES.filter((s) => reel.some((p) => p.style === s.id));
  const shown = filter === "all" ? reel : reel.filter((p) => p.style === filter);

  if (reel.length === 0) {
    return (
      <section className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
        <Mascot mood="idle" size={130} />
        <h1 className="font-marquee mt-4 text-4xl font-extrabold uppercase leading-none">Nothing on the reel yet</h1>
        <p className="mt-2 max-w-xs text-silver">Every portrait you shoot lands here. Star the best ones to build a premiere.</p>
        <button onClick={onStudio} className="mt-6 min-h-12 rounded-full bg-stock px-7 font-semibold text-stock-ink active:scale-[0.98]">
          Go to the studio
        </button>
      </section>
    );
  }

  return (
    <section className="pb-8 pt-2">
      <div className="flex items-end justify-between px-5">
        <h1 className="font-marquee text-5xl font-extrabold uppercase leading-none">Reel</h1>
        <p className="font-script pb-1 text-sm text-silver">
          {reel.length} {reel.length === 1 ? "take" : "takes"}
        </p>
      </div>

      <div className="mt-6 px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-silver">Highlights</h2>
          {highlights.length > 0 && (
            <button onClick={onPremiere} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-stock">
              <Play weight="fill" size={16} /> Play premiere
            </button>
          )}
        </div>
        {highlights.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-line p-4 text-sm text-silver">
            Tap the star on a portrait to add it to your highlights. They play back as a premiere.
          </p>
        ) : (
          <div className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
            {highlights.map((p) => (
              <button key={p.id} onClick={() => onOpen(p.id)} className="w-24 shrink-0 text-left">
                <div className="overflow-hidden rounded-lg border-2 border-stock">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="" className="aspect-[4/5] w-full object-cover" />
                </div>
                <p className="mt-1 truncate text-xs text-silver">{findStyle(p.style)?.title}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {films.length > 1 && (
        <div className="-mx-0 mt-6 flex gap-2 overflow-x-auto px-5 pb-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All films
          </FilterChip>
          {films.map((s) => (
            <FilterChip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>
              {s.title}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 px-5 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => {
          const s = findStyle(p.style);
          return (
            <button key={p.id} onClick={() => onOpen(p.id)} className="text-left">
              <div className="overflow-hidden rounded-md border border-line bg-frame">
                <div className="sprockets h-2.5 bg-frame" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`${p.petName || "Pet"} in ${s?.title}`} className="aspect-[4/5] w-full object-cover" />
                <div className="sprockets h-2.5 bg-frame" />
              </div>
              <div className="mt-1.5 flex items-start justify-between gap-2">
                <p className="text-sm leading-tight">
                  <span className="block font-semibold">{s?.title}</span>
                  <span className="font-script text-xs text-silver">{s?.year}</span>
                </p>
                {p.starred && <Star size={16} weight="fill" className="mt-0.5 shrink-0 text-stock" aria-label="Highlight" />}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 shrink-0 rounded-full border px-3.5 text-sm ${active ? "border-stock bg-stock text-stock-ink" : "border-line text-silver"}`}
    >
      {children}
    </button>
  );
}
