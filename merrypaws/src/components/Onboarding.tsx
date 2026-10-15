"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { Polaroid, Print, Tape } from "@/components/Vintage";
import { BRAND, MASCOT } from "@/lib/config";
import { track, type PetKind } from "@/lib/client";
import { displayName, named } from "@/i18n/app";
import { useT, type T } from "@/i18n/react";
import type { Costume } from "@/lib/styles";

type Step = 0 | 1 | 2 | 3;
const STEPS = 4;

// The first page shows a handful; the rest of the camera roll can come later.
// Capped so a new free album has room for a month of photos of the day.
const MAX_FIRST_PHOTOS = 12;

type Props = {
  // Resolves with the files that didn't upload.
  onPhotos: (files: File[], petName: string) => Promise<File[]>;
  uploaded: number;
  total: number;
  onDone: (profile: { petName: string; kind: PetKind; memorial: boolean }, next: "album" | "portrait") => void;
  invitedBy?: string | null;
  // "Already have an album?": a new phone signs in instead of starting over.
  onSignIn: () => void;
};

// Four short scenes: the promise, the star, their photos, and the first page
// of the album made from them. The last scene is the aha: their own dog, in a
// vintage album, before any account, form or price.
export function Onboarding({ onPhotos, uploaded, total, onDone, invitedBy, onSignIn }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PetKind>("dog");
  const [memorial, setMemorial] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  // How many were picked, and which didn't make it once the upload settles
  // (null while it's still going).
  const [chosen, setChosen] = useState(0);
  const [failed, setFailed] = useState<File[] | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => track(["intro_seen", "onboarding_name", "onboarding_photos", "onboarding_page"][step]), [step]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const t = useT();
  const { tp } = t;
  const star = displayName(t, name);
  const done = (next: "album" | "portrait") => onDone({ petName: name.trim(), kind, memorial }, next);

  async function upload(files: File[]) {
    setFailed(null);
    setFailed(await onPhotos(files, name.trim()));
  }
  const inAlbum = chosen - (failed?.length ?? 0);
  const allIn = failed !== null && failed.length === 0 && chosen > 0;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex h-11 items-center justify-between">
        {step > 0 && step < 3 ? (
          <button onClick={() => setStep((s) => (s - 1) as Step)} aria-label={t("common.back")} className="-ml-2 flex h-11 w-11 items-center justify-center">
            <ArrowLeft size={22} />
          </button>
        ) : (
          <span className="font-display italic">{BRAND}</span>
        )}
        {/* Progress as paper tabs. */}
        <div className="flex gap-1.5" aria-label={t("onboarding.step", { n: step + 1, total: STEPS })}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full transition ${i <= step ? "bg-accent" : "bg-sand"}`} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <>
          <Welcome t={t} />
          <h1 className="font-display mt-8 text-center text-[2.5rem] leading-[1.04] tracking-tight">
            {t("onboarding.headlineStart")} <span className="font-script text-[3.2rem] text-accent">{t("onboarding.headlineWord")}</span>
          </h1>
          <p className="mx-auto mt-3 max-w-[31ch] text-center text-muted">
            {t("onboarding.intro")}
          </p>
          {invitedBy && <p className="font-hand mt-3 text-center text-lg leading-normal">{t("onboarding.invited")}</p>}
          <Footer>
            <Primary onClick={() => setStep(1)}>{t("onboarding.begin")}</Primary>
            <button onClick={onSignIn} className="mt-2 min-h-11 w-full text-muted">
              {t("onboarding.haveAlbum")} <span className="text-ink underline underline-offset-4">{t("onboarding.signIn")}</span>
            </button>
          </Footer>
        </>
      )}

      {step === 1 && (
        <>
          <div className="mt-8 flex justify-center">
            <Mascot mood="cheer" size={120} />
          </div>
          <h1 className="font-display mt-4 text-center text-[2.4rem] leading-tight">
            {t("onboarding.whoStart")} <span className="font-script text-[3rem] text-accent">{t("onboarding.whoWord")}</span>
            {t("onboarding.whoEnd")}
          </h1>
          <label htmlFor="pet-name" className="sr-only">
            {t("onboarding.theirName")}
          </label>
          <input
            id="pet-name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            onKeyDown={(e) => e.key === "Enter" && setStep(2)}
            placeholder={t("onboarding.theirName")}
            autoComplete="off"
            className="font-hand mx-auto mt-6 w-full max-w-xs border-b-2 border-dashed border-ink/25 bg-transparent py-3 text-center text-3xl leading-normal outline-none placeholder:text-muted/60 focus:border-accent"
          />
          <div className="mt-6 flex justify-center gap-2" role="radiogroup" aria-label={t("onboarding.kindOfPet")}>
            {(["dog", "cat", "other"] as const).map((k) => (
              <button
                key={k}
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-11 rounded-full px-5 transition ${kind === k ? "bg-ink text-paper" : "bg-sand"}`}
              >
                {t(`common.kinds.${k}`)}
              </button>
            ))}
          </div>
          <label className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={memorial} onChange={(e) => setMemorial(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            {t("onboarding.memorialCheck")}
          </label>
          <Footer>
            <Primary onClick={() => setStep(2)}>{name.trim() ? t("onboarding.continueWith", { name: name.trim() }) : t("onboarding.continue")}</Primary>
          </Footer>
        </>
      )}

      {step === 2 && (
        <>
          <EmptyPage />
          <h1 className="font-display mt-8 text-center text-[2.2rem] leading-tight">
            {named(t, "onboarding.addPhotos", name)}
          </h1>
          <p className="mx-auto mt-3 max-w-[30ch] text-center text-muted">{t("onboarding.photosHint")}</p>
          <Footer>
            <Primary onClick={() => input.current?.click()}>{t("onboarding.choosePhotos")}</Primary>
            <button onClick={() => done("album")} className="mt-2 min-h-12 w-full text-muted underline underline-offset-4">
              {t("onboarding.later")}
            </button>
          </Footer>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            data-testid="onboarding-photos"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []).slice(0, MAX_FIRST_PHOTOS);
              e.target.value = "";
              if (!files.length) return;
              setPreviews(files.map((f) => URL.createObjectURL(f)));
              setChosen(files.length);
              void upload(files);
              setStep(3);
            }}
          />
        </>
      )}

      {step === 3 && (
        <>
          <p className="font-script mt-4 text-center text-[3rem] leading-[1.1]">{star}</p>
          <p className="font-hand text-center text-lg leading-normal text-muted">{memorial ? t("onboarding.inLovingMemory") : t("onboarding.chapterOne")}</p>
          <FirstPage previews={previews} />
          <p className="relative z-10 mt-4 text-center text-sm text-muted" aria-live="polite">
            {failed === null
              ? t("onboarding.putting", { done: Math.min(uploaded, chosen), total: total || chosen })
              : failed.length === 0
                ? name.trim()
                  ? tp("onboarding.allInNamed", chosen, { name: name.trim() })
                  : tp("onboarding.allInAnon", chosen)
                : inAlbum === 0
                  ? t("onboarding.offline")
                  : t("onboarding.partial", { done: inAlbum, total: chosen, failed: failed.length })}
          </p>
          {failed !== null && failed.length > 0 && (
            <p className="relative z-10 mt-2 text-center">
              <button onClick={() => void upload(failed)} className="min-h-11 rounded-full border border-ink/20 px-5 text-sm font-medium">
                {t("common.tryAgain")}
              </button>
            </p>
          )}
          {!memorial && allIn && (
            <p className="rise mt-2 text-center">
              <span className="dymo" data-tone="red">{t("onboarding.dayOne")}</span>
            </p>
          )}
          <Footer>
            <Primary onClick={() => done("album")}>{named(t, "onboarding.open", name)}</Primary>
            <button onClick={() => done("portrait")} className="mt-2 min-h-12 w-full text-muted underline underline-offset-4">
              {t("onboarding.makePortrait")}
            </button>
          </Footer>
        </>
      )}
    </main>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto pt-8">{children}</div>;
}

function Primary({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex min-h-14 w-full items-center justify-center rounded-full bg-accent text-lg font-medium text-accent-ink transition active:scale-[0.98]">
      {children}
    </button>
  );
}

// Biscuit's own album page: three prints, taped down.
function MascotSnap({ costume, bg, caption, date, rotate, className }: { costume: Costume; bg: string; caption: string; date: string; rotate: number; className: string }) {
  return (
    <div className={`polaroid absolute w-[46%] ${className}`} style={{ transform: `rotate(${rotate}deg)` }}>
      <div className="grain relative flex aspect-square items-end justify-center overflow-hidden" style={{ background: bg }}>
        <Mascot size={96} costume={costume} still className="mb-[4%]" />
        <span className="datestamp absolute bottom-[5%] right-[6%] text-[0.65rem]">{date}</span>
      </div>
      <p className="font-hand absolute inset-x-[7%] bottom-[4%] truncate text-center text-[0.78rem] leading-normal text-[#3a2a20]">{caption}</p>
    </div>
  );
}

function Welcome({ t }: { t: T }) {
  return (
    <div className="relative mx-auto mt-4 aspect-[10/9] w-full max-w-[21rem]" aria-label={t("onboarding.mascotPage", { mascot: MASCOT })} role="img">
      <MascotSnap costume="none" bg="linear-gradient(180deg,#b9d3e4,#e7d9b8)" caption={t("onboarding.snaps.walk")} date="'19 4 2" rotate={-6} className="left-0 top-[8%]" />
      <MascotSnap costume="scarf" bg="radial-gradient(circle at 30% 30%,#f1c070 0 3px,transparent 4px),radial-gradient(90% 80% at 50% 40%,#8e2a22,#3a0f0c)" caption={t("onboarding.snaps.christmas")} date="'19 12 25" rotate={5} className="right-0 top-0" />
      <MascotSnap costume="none" bg="linear-gradient(180deg,#f3cf98,#9fbfb6)" caption={t("onboarding.snaps.lake")} date="'20 7 14" rotate={-1} className="bottom-0 left-[26%]" />
      <Tape className="left-[14%] top-[4%]" rotate={-18} />
      <Tape className="right-[12%] -top-2" rotate={10} />
      <Tape className="top-[40%] left-[40%]" rotate={-4} />
    </div>
  );
}

function EmptyPage() {
  return (
    <div className="mx-auto mt-6 grid w-full max-w-[18rem] grid-cols-2 gap-5" aria-hidden>
      {[-4, 3, 2, -3].map((r, i) => (
        <div key={i} className="corners aspect-[4/5] border-2 border-dashed border-ink/20 bg-card/60" style={{ transform: `rotate(${r}deg)` }} />
      ))}
    </div>
  );
}

// Their photos, laid onto the first page one by one.
function FirstPage({ previews }: { previews: string[] }) {
  const shown = previews.slice(0, 5);
  const slots = [
    "left-0 top-0 w-[54%] -rotate-3",
    "right-0 top-[6%] w-[44%] rotate-[5deg]",
    "left-[4%] top-[48%] w-[42%] rotate-2",
    "right-[4%] top-[44%] w-[48%] -rotate-2",
    "left-[30%] top-[64%] w-[38%] rotate-1",
  ];
  return (
    <div className="relative mx-auto mt-6 aspect-[4/5.2] w-full max-w-[19rem]">
      {shown.map((src, i) => (
        <div key={src} className={`drop absolute ${slots[i]}`} style={{ animationDelay: `${300 + i * 350}ms` }}>
          {i % 2 === 0 ? <Polaroid src={src} look="summer" /> : <Print src={src} look="summer" />}
          {i < 3 && <Tape className="-top-3 left-1/3" rotate={i % 2 ? 8 : -8} />}
        </div>
      ))}
    </div>
  );
}
