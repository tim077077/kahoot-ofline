"use client";

import { Heart } from "@phosphor-icons/react";
import { useState } from "react";
import { Mascot } from "@/components/Mascot";
import { starName, type Portrait } from "@/lib/client";
import { findStyle, STYLES, type StyleId } from "@/lib/styles";

type Props = { reel: Portrait[]; onOpen: (id: string) => void; onStudio: () => void };

// The family album: highlights on top, then every portrait mounted with
// photo corners, a little crooked, the way real albums are.
export function Album({ reel, onOpen, onStudio }: Props) {
  const [filter, setFilter] = useState<StyleId | "all">("all");
  const highlights = reel.filter((p) => p.starred);
  const eras = STYLES.filter((s) => reel.some((p) => p.style === s.id));
  const shown = filter === "all" ? reel : reel.filter((p) => p.style === filter);

  if (reel.length === 0) {
    return (
      <section className="flex min-h-[72dvh] flex-col items-center justify-center px-8 text-center">
        <Mascot size={120} />
        <h1 className="font-display mt-6 text-[2rem] leading-tight">Your album is waiting</h1>
        <p className="mt-2 max-w-[30ch] text-muted">Every portrait you make is kept here, on this phone.</p>
        <button onClick={onStudio} className="mt-8 min-h-14 rounded-full bg-accent px-8 text-lg font-medium text-accent-ink active:scale-[0.98]">
          Make the first portrait
        </button>
      </section>
    );
  }

  return (
    <section className="pb-10 pt-2">
      <div className="flex items-baseline justify-between px-5">
        <h1 className="font-display text-[2.4rem] leading-none">The Album</h1>
        <p className="font-display italic text-muted">
          {reel.length} {reel.length === 1 ? "portrait" : "portraits"}
        </p>
      </div>

      <h2 className="font-display mt-8 px-5 text-xl italic">Highlights</h2>
      {highlights.length === 0 ? (
        <p className="mx-5 mt-3 flex items-center gap-3 rounded-2xl bg-card p-4 text-muted">
          <Heart size={22} className="shrink-0 text-accent" />
          Tap the heart on a portrait you love and it will wait for you here.
        </p>
      ) : (
        <div className="mt-4 flex snap-x scroll-px-5 gap-5 overflow-x-auto px-5 pb-3">
          {highlights.map((p) => (
            <button key={p.id} onClick={() => onOpen(p.id)} className="w-40 shrink-0 snap-start text-center">
              <div className="print arch !rounded-t-full !p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="arch aspect-[4/5] w-full object-cover" />
              </div>
              <p className="font-script mt-2 truncate text-2xl leading-tight">{starName(p.petName)}</p>
              <p className="font-display truncate text-sm italic text-muted">{findStyle(p.style)?.title}</p>
            </button>
          ))}
        </div>
      )}

      {eras.length > 1 && (
        <div className="mt-8 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Filter by era">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </Chip>
          {eras.map((s) => (
            <Chip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>
              {s.title}
            </Chip>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-2 gap-x-5 gap-y-8 px-6 sm:grid-cols-3 ${eras.length > 1 ? "mt-6" : "mt-8"}`}>
        {shown.map((p, i) => {
          const s = findStyle(p.style);
          return (
            <button key={p.id} onClick={() => onOpen(p.id)} className="text-center">
              <div className={`corners bg-card p-2 shadow-[0_12px_24px_-16px_var(--shadow)] ${i % 3 === 0 ? "-rotate-1" : i % 3 === 1 ? "rotate-1" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`${starName(p.petName)} in ${s?.title}`} className="aspect-[4/5] w-full object-cover" />
                {p.starred && (
                  <Heart size={18} weight="fill" className="absolute bottom-3 right-3 text-[#fbf7f0] drop-shadow" aria-label="Highlight" />
                )}
              </div>
              <p className="font-script mt-2 truncate text-xl leading-tight">{starName(p.petName)}</p>
              <p className="font-display truncate text-sm italic text-muted">
                {s?.title}, {s?.year}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 shrink-0 rounded-full px-4 text-sm transition ${active ? "bg-ink text-paper" : "bg-sand text-ink"}`}
    >
      {children}
    </button>
  );
}
