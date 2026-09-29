"use client";

import { Camera, FilmStrip, Ticket, UserPlus, X } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Leader } from "@/components/Leader";
import { Mascot } from "@/components/Mascot";
import { StyleArt } from "@/components/StyleCard";
import { MASCOT } from "@/lib/config";
import type { Portrait } from "@/lib/client";
import { prepareUpload } from "@/lib/image";
import { findStyle, STYLES, type StyleId } from "@/lib/styles";

type Upload = { blob: Blob; url: string };

export type ShootResult = { ok: true; portrait: Portrait } | { ok: false; error: string };

type Props = {
  petName: string;
  style: StyleId;
  onStyle: (id: StyleId) => void;
  samples: Record<StyleId, string | null>;
  latest: Portrait | null;
  shoot: (pet: Blob, owner: Blob | null, style: StyleId) => Promise<ShootResult>;
  onKeep: (p: Portrait) => void;
  onOpenReel: () => void;
};

export function Studio({ petName, style, onStyle, samples, latest, shoot, onKeep, onOpenReel }: Props) {
  const [pet, setPet] = useState<Upload | null>(null);
  const [owner, setOwner] = useState<Upload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<Portrait | null>(null);
  const petInput = useRef<HTMLInputElement>(null);
  const ownerInput = useRef<HTMLInputElement>(null);

  const result = shown ?? null;
  const film = findStyle(style)!;
  const star = petName || "your pet";

  async function pick(file: File | undefined, set: (u: Upload | null) => void, prev: Upload | null) {
    if (!file) return;
    setError(null);
    try {
      const blob = await prepareUpload(file);
      if (prev) URL.revokeObjectURL(prev.url);
      set({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError("That photo couldn't be read. Try a JPG or PNG.");
    }
  }

  async function action() {
    if (!pet || busy) return;
    setBusy(true);
    setError(null);
    setShown(null);
    const res = await shoot(pet.blob, owner?.blob ?? null, style);
    setBusy(false);
    if (res.ok) setShown(res.portrait);
    else setError(res.error);
  }

  if (busy) {
    return (
      <section className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center" aria-live="polite">
        <div className="relative w-full max-w-[18rem] overflow-hidden rounded-lg border border-line">
          <div className="sprockets h-3 bg-frame" />
          <div className="aspect-square">
            <Leader />
          </div>
          <div className="sprockets h-3 bg-frame" />
        </div>
        <Mascot mood="working" size={110} className="-mt-6" />
        <p className="font-marquee mt-2 text-2xl font-extrabold uppercase">Developing the film</p>
        <p className="mt-1 text-sm text-silver">Usually 20 to 40 seconds. {MASCOT} is in the darkroom.</p>
      </section>
    );
  }

  if (result) {
    const s = findStyle(result.style)!;
    return (
      <section className="px-5 pb-8 pt-4">
        <div className="mx-auto max-w-sm">
          <div className="overflow-hidden rounded-lg border border-line bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.preview} alt={`${star} in ${s.title}`} className="develop block w-full" />
          </div>
          <div className="rise mt-5 text-center" style={{ animationDelay: "1.2s" }}>
            <p className="font-script text-sm text-silver">{(petName || "Your pet").toUpperCase()} in</p>
            <p className="font-marquee text-4xl font-extrabold uppercase leading-none">{s.title}</p>
            <p className="font-script mt-1 text-sm text-silver">{s.year}</p>
          </div>
          {result.mock && (
            <p className="mt-3 text-center text-xs text-warn">Demo mode: no FAL_KEY yet, so this is your own photo.</p>
          )}
          <div className="mt-6 grid gap-3">
            <button
              onClick={() => onKeep(result)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-stock font-semibold text-stock-ink active:scale-[0.98]"
            >
              <Ticket size={20} weight="bold" /> Keep it in full quality
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => void action()}
                className="min-h-12 rounded-full border border-line font-semibold text-screen active:scale-[0.98]"
              >
                Another take
              </button>
              <button
                onClick={() => setShown(null)}
                className="min-h-12 rounded-full border border-line font-semibold text-screen active:scale-[0.98]"
              >
                New film
              </button>
            </div>
            <button onClick={onOpenReel} className="inline-flex min-h-11 items-center justify-center gap-2 text-sm text-silver">
              <FilmStrip size={18} /> It&apos;s saved in your reel
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 pb-8 pt-2">
      <h1 className="font-marquee text-5xl font-extrabold uppercase leading-none">Studio</h1>
      <p className="mt-1 text-silver">Cast {star}, choose the film, call action.</p>

      <div className="mt-6 grid grid-cols-[1fr_auto] gap-3">
        <button
          onClick={() => petInput.current?.click()}
          className="group relative overflow-hidden rounded-lg border border-line bg-reel text-left"
          aria-label={pet ? "Change your pet's photo" : "Add your pet's photo"}
        >
          <div className="sprockets h-3 bg-frame" />
          <div className="relative aspect-[4/5]">
            {pet ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pet.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <Camera size={34} className="text-stock" />
                <span className="font-semibold">The star</span>
                <span className="text-sm text-silver">A clear photo of their face</span>
              </div>
            )}
          </div>
          <div className="sprockets h-3 bg-frame" />
        </button>

        <div className="flex w-24 flex-col gap-2">
          <button
            onClick={() => ownerInput.current?.click()}
            className="relative overflow-hidden rounded-lg border border-dashed border-line bg-reel"
            aria-label={owner ? "Change your photo" : "Add yourself as co-star"}
          >
            <div className="aspect-[4/5]">
              {owner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={owner.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-1 text-center">
                  <UserPlus size={22} className="text-silver" />
                  <span className="text-[11px] leading-tight text-silver">Co-star: you</span>
                </div>
              )}
            </div>
          </button>
          {owner && (
            <button onClick={() => setOwner(null)} className="inline-flex min-h-11 items-center justify-center gap-1 text-xs text-silver">
              <X size={14} /> Remove
            </button>
          )}
        </div>
      </div>
      <input ref={petInput} type="file" accept="image/*" className="hidden" data-testid="pet-input" onChange={(e) => void pick(e.target.files?.[0], setPet, pet)} />
      <input ref={ownerInput} type="file" accept="image/*" className="hidden" data-testid="owner-input" onChange={(e) => void pick(e.target.files?.[0], setOwner, owner)} />

      <h2 className="mt-8 text-sm font-semibold text-silver">The film</h2>
      <div className="-mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => onStyle(s.id)}
            aria-pressed={style === s.id}
            className={`w-28 shrink-0 snap-start overflow-hidden rounded-lg border-2 text-left transition ${style === s.id ? "border-stock" : "border-transparent"}`}
          >
            <StyleArt style={s} sample={samples[s.id]} compact />
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-silver">{film.blurb}</p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
          {error}
        </p>
      )}

      <button
        onClick={() => void action()}
        disabled={!pet}
        className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-stock text-lg font-bold uppercase tracking-wide text-stock-ink transition active:scale-[0.98] disabled:bg-frame disabled:text-dim"
      >
        Action
      </button>
      {!pet && <p className="mt-2 text-center text-xs text-dim">Add the star&apos;s photo first</p>}

      {latest && (
        <button onClick={onOpenReel} className="mt-8 flex w-full items-center gap-3 rounded-lg border border-line bg-reel p-2 text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={latest.preview} alt="" className="h-14 w-11 rounded object-cover" />
          <span className="text-sm">
            <span className="block font-semibold">Last take: {findStyle(latest.style)?.title}</span>
            <span className="text-silver">Open your reel</span>
          </span>
        </button>
      )}
    </section>
  );
}
