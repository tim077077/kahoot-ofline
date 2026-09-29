"use client";

import { Pause, Play, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/config";
import type { Portrait } from "@/lib/client";
import { findStyle } from "@/lib/styles";

const SLIDE_MS = 5000;
const CARD_MS = 2600;

type Frame = { kind: "open" } | { kind: "still"; p: Portrait } | { kind: "end" };

// The highlights, played back like a screening: opening credits, each still
// with a slow push-in and its title, then THE END.
export function Premiere({ reel, petName, onClose }: { reel: Portrait[]; petName: string; onClose: () => void }) {
  const highlights = reel.filter((p) => p.starred);
  const stills = highlights.length > 0 ? highlights : reel;
  const frames: Frame[] = [{ kind: "open" }, ...stills.map((p) => ({ kind: "still" as const, p })), { kind: "end" }];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const frame = frames[Math.min(i, frames.length - 1)];

  useEffect(() => {
    if (paused || i >= frames.length - 1) return;
    const t = setTimeout(() => setI((v) => v + 1), frame.kind === "still" ? SLIDE_MS : CARD_MS);
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

  const star = (petName || "Your pet").toUpperCase();

  return (
    <div role="dialog" aria-modal="true" aria-label="Premiere" className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="h-[9vh] bg-black" />
      <div className="relative flex-1 overflow-hidden">
        {frame.kind === "open" && (
          <div key="open" className="rise flex h-full flex-col items-center justify-center px-8 text-center">
            <p className="font-script text-sm text-silver">{BRAND} presents</p>
            <p className="font-marquee mt-3 text-6xl font-extrabold uppercase leading-none text-screen">{star}</p>
            <p className="font-script mt-3 text-sm text-silver">in {stills.length} {stills.length === 1 ? "picture" : "pictures"}</p>
          </div>
        )}
        {frame.kind === "still" && (
          <div key={frame.p.id} className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frame.p.preview} alt="" className={`h-full w-full object-contain ${paused ? "" : "kenburns"}`} />
            <div className="rise absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-6 pb-6 pt-16 text-center" style={{ animationDelay: "0.6s" }}>
              <p className="font-marquee text-3xl font-extrabold uppercase leading-none text-screen">{findStyle(frame.p.style)?.title}</p>
              <p className="font-script mt-1 text-xs text-silver">{findStyle(frame.p.style)?.year}</p>
            </div>
          </div>
        )}
        {frame.kind === "end" && (
          <div key="end" className="rise flex h-full flex-col items-center justify-center gap-6">
            <p className="font-marquee text-6xl font-extrabold uppercase text-screen">The End</p>
            <button onClick={() => setI(0)} className="min-h-11 rounded-full border border-line px-5 text-sm text-screen">
              Play again
            </button>
          </div>
        )}
        <div className="grain !absolute !inset-0 !z-10 !opacity-10" aria-hidden />
      </div>
      <div className="flex h-[9vh] min-h-14 items-center justify-between bg-black px-4 pb-[env(safe-area-inset-bottom)]">
        <button onClick={onClose} aria-label="Close premiere" className="flex h-11 w-11 items-center justify-center text-screen">
          <X size={24} />
        </button>
        <div className="flex gap-1">
          {frames.map((_, j) => (
            <span key={j} className={`h-1 w-4 rounded-full ${j <= i ? "bg-stock" : "bg-frame"}`} />
          ))}
        </div>
        <button onClick={() => setPaused((v) => !v)} aria-label={paused ? "Play" : "Pause"} className="flex h-11 w-11 items-center justify-center text-screen">
          {paused ? <Play size={22} weight="fill" /> : <Pause size={22} weight="fill" />}
        </button>
      </div>
    </div>
  );
}
