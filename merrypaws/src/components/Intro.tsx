"use client";

import { useEffect } from "react";
import { Mascot } from "@/components/Mascot";
import { StyleArt } from "@/components/StyleCard";
import { BRAND, MASCOT } from "@/lib/config";
import { track } from "@/lib/client";
import { STYLES, type StyleId } from "@/lib/styles";

// One screen, one promise, one button. The proof is a before and after on a
// loop; the first portrait itself is the rest of the onboarding.
export function Intro({ samples, onStart }: { samples: Record<StyleId, string | null>; onStart: () => void }) {
  useEffect(() => track("intro_seen"), []);
  const royal = STYLES[0];

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <p className="font-display text-center text-lg italic">{BRAND}</p>

      <div className="relative mx-auto mt-6 w-[68%] max-w-[16rem]">
        <div className="print arch !rounded-t-full">
          <div className="arch relative overflow-hidden">
            {/* Before: an everyday phone photo. */}
            <div className="grain arch flex aspect-[4/5] items-end justify-center bg-blue">
              <Mascot size={150} className="mb-[4%]" />
            </div>
            {/* After: the same dog, painted in 1654. */}
            <div className="after-loop absolute inset-0">
              <StyleArt style={royal} sample={samples[royal.id]} mascotSize={150} />
            </div>
          </div>
        </div>
        <Badge />
      </div>
      <p className="font-script mt-4 text-center text-2xl" aria-hidden>
        {MASCOT}, {royal.year}
      </p>

      <h1 className="font-display mt-4 text-center text-[2.6rem] leading-[1.02] tracking-tight">
        Turn your pet
        <br />
        into a <span className="font-script text-[3.3rem] font-normal text-accent">memory</span>
      </h1>
      <p className="mx-auto mt-3 max-w-[30ch] text-center text-muted">
        A vintage portrait of your pet, with you in it too if you like. Your first one is free.
      </p>

      <div className="mt-auto pt-8">
        <button
          onClick={onStart}
          className="flex min-h-14 w-full items-center justify-center rounded-full bg-accent text-lg font-medium text-accent-ink transition active:scale-[0.98]"
        >
          Choose a photo
        </button>
        <p className="mt-3 text-center text-sm text-muted">We only use your photos to make your portrait.</p>
      </div>
    </main>
  );
}

// A round studio stamp on the corner of the print, turning slowly.
function Badge() {
  const text = "PORTRAIT STUDIO · EST. 2026 · PORTRAIT STUDIO · EST. 2026 · ";
  return (
    <div className="absolute -bottom-4 -right-8 h-24 w-24 rounded-full bg-paper p-1 shadow-[0_8px_20px_-10px_var(--shadow)]" aria-hidden>
      <svg viewBox="0 0 100 100" className="spin-slow h-full w-full">
        <defs>
          <path id="badge-circle" d="M 50 50 m -38 0 a 38 38 0 1 1 76 0 a 38 38 0 1 1 -76 0" />
        </defs>
        <text className="font-sans" fontSize="8.6" letterSpacing="1.2" fill="currentColor">
          <textPath href="#badge-circle">{text}</textPath>
        </text>
      </svg>
      <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-7 w-7 text-accent" fill="currentColor">
        <ellipse cx="12" cy="16" rx="5" ry="4" />
        <ellipse cx="6" cy="10" rx="2" ry="2.6" />
        <ellipse cx="10" cy="6.5" rx="2" ry="2.6" />
        <ellipse cx="14" cy="6.5" rx="2" ry="2.6" />
        <ellipse cx="18" cy="10" rx="2" ry="2.6" />
      </svg>
    </div>
  );
}
