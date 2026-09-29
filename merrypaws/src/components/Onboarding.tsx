"use client";

import { ArrowRight, Cat, Dog, PawPrint } from "@phosphor-icons/react";
import { useState } from "react";
import { Mascot } from "@/components/Mascot";
import { StyleArt } from "@/components/StyleCard";
import { BRAND, MASCOT } from "@/lib/config";
import type { PetKind, Profile } from "@/lib/client";
import { STYLES, type StyleId } from "@/lib/styles";

const FIRST_FILMS: StyleId[] = ["royal-court", "film-noir", "technicolor", "holiday-special"];

const KINDS: { id: PetKind; label: string; Icon: typeof Dog }[] = [
  { id: "dog", label: "Dog", Icon: Dog },
  { id: "cat", label: "Cat", Icon: Cat },
  { id: "other", label: "Other", Icon: PawPrint },
];

// Three short scenes, then straight into the studio with everything filled in.
// The first real portrait is the aha moment, so onboarding gets out of the way.
export function Onboarding({ samples, onDone }: { samples: Record<StyleId, string | null>; onDone: (p: Profile) => void }) {
  const [scene, setScene] = useState(0);
  const [petName, setPetName] = useState("");
  const [kind, setKind] = useState<PetKind>("dog");
  const [favorite, setFavorite] = useState<StyleId>("royal-court");

  const finish = (skip = false) =>
    onDone({ petName: skip ? "" : petName.trim(), kind, favorite, onboarded: true });

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-booth pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex gap-1.5" aria-label={`Scene ${scene + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-2.5 w-4 rounded-[2px] transition-colors ${i <= scene ? "bg-stock" : "bg-frame"}`} />
          ))}
        </div>
        <button onClick={() => finish(true)} className="min-h-11 px-2 text-sm text-silver hover:text-screen">
          Skip
        </button>
      </div>

      {scene === 0 && (
        <div key="s0" className="rise flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="relative">
            {/* Spotlight on the stage */}
            <div className="flicker absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/3 rounded-full bg-stock/20 blur-3xl" aria-hidden />
            <Mascot mood="cheer" size={176} className="relative" />
          </div>
          <p className="font-script mt-6 text-sm text-silver">{BRAND} presents</p>
          <h1 className="font-marquee mt-2 max-w-sm text-5xl font-extrabold uppercase leading-[0.95]">
            Your pet, starring in a classic film
          </h1>
          <p className="mt-4 max-w-xs text-silver">
            One photo, one film, and about a minute. I&apos;m {MASCOT}, I&apos;ll be directing.
          </p>
          <button
            onClick={() => setScene(1)}
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-stock px-7 font-semibold text-stock-ink active:scale-[0.98]"
          >
            Roll camera <ArrowRight weight="bold" />
          </button>
        </div>
      )}

      {scene === 1 && (
        <div key="s1" className="rise flex flex-1 flex-col px-6 pt-10">
          <Mascot mood="idle" size={96} />
          <h2 className="font-marquee mt-4 text-4xl font-extrabold uppercase leading-none">Who&apos;s the star?</h2>
          <p className="mt-2 text-silver">Their name goes in the opening credits.</p>
          <label htmlFor="pet-name" className="mt-8 block text-sm font-medium text-silver">
            Pet&apos;s name
          </label>
          <input
            id="pet-name"
            value={petName}
            onChange={(e) => setPetName(e.target.value.slice(0, 24))}
            placeholder="Luna"
            autoComplete="off"
            className="mt-2 min-h-12 rounded-xl border border-line bg-reel px-4 text-lg text-screen outline-none focus:border-stock"
          />
          <p className="mt-6 text-sm font-medium text-silver">They&apos;re a</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {KINDS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setKind(id)}
                aria-pressed={kind === id}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border text-sm ${kind === id ? "border-stock bg-stock-soft text-screen" : "border-line bg-reel text-silver"}`}
              >
                <Icon size={22} weight={kind === id ? "fill" : "regular"} />
                {label}
              </button>
            ))}
          </div>
          <div className="mt-auto pb-6 pt-8">
            <button
              onClick={() => setScene(2)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-stock font-semibold text-stock-ink active:scale-[0.98]"
            >
              Next <ArrowRight weight="bold" />
            </button>
          </div>
        </div>
      )}

      {scene === 2 && (
        <div key="s2" className="rise flex flex-1 flex-col px-6 pt-10">
          <h2 className="font-marquee text-4xl font-extrabold uppercase leading-none">
            Pick {petName.trim() ? `${petName.trim()}'s` : "their"} first film
          </h2>
          <p className="mt-2 text-silver">You can make as many as you like later.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {FIRST_FILMS.map((id) => {
              const style = STYLES.find((s) => s.id === id)!;
              return (
                <button
                  key={id}
                  onClick={() => setFavorite(id)}
                  aria-pressed={favorite === id}
                  className={`overflow-hidden rounded-xl border-2 text-left transition ${favorite === id ? "border-stock" : "border-transparent opacity-80"}`}
                >
                  <StyleArt style={style} sample={samples[id]} />
                </button>
              );
            })}
          </div>
          <div className="mt-auto pb-6 pt-8">
            <button
              onClick={() => finish()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-stock font-semibold text-stock-ink active:scale-[0.98]"
            >
              Start filming <ArrowRight weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
