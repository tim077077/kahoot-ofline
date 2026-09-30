"use client";

import { ArrowCounterClockwise, Check, CheckCircle, Circle, DownloadSimple, ShareNetwork, XCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { StyleArt } from "@/components/StyleCard";
import { MASCOT } from "@/lib/config";
import { downloadUrl, starName, track, type Photo, type Portrait, type UploadPhase } from "@/lib/client";
import { prepareUpload } from "@/lib/image";
import { checkPhoto, PROBLEM_TEXT, type PhotoProblem } from "@/lib/photoCheck";
import { findStyle, STYLES, type Style, type StyleId } from "@/lib/styles";

type Upload = { blob: Blob; url: string };
type Step = "photo" | "style" | "develop" | "reveal";

export type ShootResult = { ok: true; portrait: Portrait } | { ok: false; error: string; code?: string };
export type ShootRequest = { pet: Blob; owner: Blob | null; style: StyleId; memorial: boolean };

type Props = {
  petName: string;
  onPetName: (name: string) => void;
  style: StyleId;
  onStyle: (id: StyleId) => void;
  samples: Record<StyleId, string | null>;
  freeLeft: number;
  previews: number;
  album: Photo[];
  credits: number;
  shoot: (req: ShootRequest, onPhase: (p: UploadPhase) => void) => Promise<ShootResult>;
  onKeep: (p: Portrait) => void;
  onShare: (p: Portrait) => void;
  onPlans: () => void;
  onOpenAlbum: () => void;
};

export function Studio(props: Props) {
  const [step, setStep] = useState<Step>("photo");
  const [pet, setPet] = useState<Upload | null>(null);
  const [owner, setOwner] = useState<Upload | null>(null);
  const [memorial, setMemorial] = useState(false);
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [result, setResult] = useState<Portrait | null>(null);
  const [phase, setPhase] = useState<UploadPhase | { kind: "drying" }>({ kind: "loading", progress: 0 });

  useEffect(() => {
    if (step === "photo") track("photo_step");
    if (step === "style") track("style_step");
  }, [step]);

  async function develop() {
    if (!pet) return;
    setError(null);
    setPhase({ kind: "loading", progress: 0 });
    setStep("develop");
    const res = await props.shoot({ pet: pet.blob, owner: owner?.blob ?? null, style: props.style, memorial }, setPhase);
    if (!res.ok) {
      setError({ text: res.error, code: res.code });
      setStep("style");
      return;
    }
    // Drying: the print is decoded before it is shown, so the reveal never
    // starts on a half-loaded image.
    setPhase({ kind: "drying" });
    const img = new Image();
    img.src = res.portrait.preview;
    await img.decode().catch(() => {});
    setResult(res.portrait);
    setStep("reveal");
    track("reveal_seen");
  }

  if (step === "photo") {
    return (
      <PhotoStep
        current={pet}
        onPicked={(u) => {
          if (pet && pet.url !== u.url) URL.revokeObjectURL(pet.url);
          setPet(u);
          setStep("style");
        }}
        onBack={pet ? () => setStep("style") : undefined}
        album={props.album}
      />
    );
  }

  if (step === "develop") {
    return <DevelopStep photo={pet?.url ?? null} phase={phase} memorial={memorial} />;
  }

  if (step === "reveal" && result) {
    return (
      <RevealStep
        portrait={result}
        onKeep={() => props.onKeep(result)}
        onShare={() => props.onShare(result)}
        onAnother={() => setStep("style")}
        onOpenAlbum={props.onOpenAlbum}
      />
    );
  }

  const selected = findStyle(props.style)!;
  const star = starName(props.petName);

  return (
    <section className="px-5 pb-10 pt-2">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setStep("photo")}
          className="print w-16 shrink-0 !p-1 !pb-1.5"
          aria-label="Change the star's photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {pet && <img src={pet.url} alt="" className="aspect-square w-full object-cover" />}
        </button>
        <div>
          <h1 className="font-display text-[2rem] leading-none">Choose the era</h1>
          <p className="mt-1 text-muted">Where should {star === "Your pet" ? "they" : star} be remembered?</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5" role="radiogroup" aria-label="Era">
        {STYLES.map((s) => (
          <EraCard key={s.id} style={s} sample={props.samples[s.id]} selected={props.style === s.id} onSelect={() => props.onStyle(s.id)} />
        ))}
      </div>
      <p className="mt-4 text-muted">
        <span className="font-display italic text-ink">{selected.title}.</span> {selected.blurb}
      </p>

      <div className="mt-8 divide-y divide-line border-y border-line">
        <label className="flex min-h-16 items-center justify-between gap-4 py-3">
          <span>
            <span className="block font-medium">Their name</span>
            <span className="text-sm text-muted">Written on the title card</span>
          </span>
          <input
            value={props.petName}
            onChange={(e) => props.onPetName(e.target.value.slice(0, 24))}
            placeholder="Luna"
            autoComplete="off"
            className="min-h-11 w-36 rounded-full border border-line bg-card px-4 text-right text-base outline-none focus:border-accent"
          />
        </label>
        <OwnerRow owner={owner} setOwner={setOwner} star={star} />
        <Toggle
          label="In loving memory"
          hint="For a pet who has passed. Gentler words, same care."
          checked={memorial}
          onChange={setMemorial}
        />
      </div>

      {error && (
        <div role="alert" className="mt-6 rounded-2xl bg-card p-4 text-ink shadow-[0_10px_30px_-20px_var(--shadow)]">
          <p>{error.text}</p>
          {error.code === "limit_reached" && (
            <button onClick={props.onPlans} className="mt-2 min-h-11 font-medium text-accent underline underline-offset-4">
              See portrait credits
            </button>
          )}
        </div>
      )}

      <button
        onClick={() => void develop()}
        disabled={!pet}
        className="mt-8 flex min-h-14 w-full items-center justify-center rounded-full bg-accent text-lg font-medium text-accent-ink transition active:scale-[0.98] disabled:opacity-40"
      >
        Develop the portrait
      </button>
      <p className="mt-3 text-center text-sm text-muted">
        {props.previews > 0
          ? `Uses 1 of your ${props.previews} previews. Keeping one in HD uses a credit (you have ${props.credits}).`
          : props.freeLeft > 0
            ? "Your first portrait is free."
            : "You've used your free portrait. Credits let you make more."}
      </p>
    </section>
  );
}

function EraCard({ style, sample, selected, onSelect }: { style: Style; sample: string | null; selected: boolean; onSelect: () => void }) {
  return (
    <button role="radio" aria-checked={selected} onClick={onSelect} className="group text-left">
      <div className={`arch relative p-1 transition ${selected ? "bg-accent" : "bg-transparent"}`}>
        <StyleArt style={style} sample={sample} mascotSize={88} />
        {selected && (
          <span className="absolute right-2 top-[18%] flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-ink">
            <Check size={16} weight="bold" />
          </span>
        )}
      </div>
      <p className="font-display mt-2 text-[1.05rem] leading-tight">{style.title}</p>
      <p className="font-display text-sm italic text-muted">{style.year}</p>
    </button>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-16 w-full items-center justify-between gap-4 py-3 text-left">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="text-sm text-muted">{hint}</span>
      </span>
      <span className={`relative h-8 w-13 shrink-0 rounded-full transition ${checked ? "bg-accent" : "bg-sand"}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-card shadow transition-all ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function OwnerRow({ owner, setOwner, star }: { owner: Upload | null; setOwner: (u: Upload | null) => void; star: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 py-3">
      <span>
        <span className="block font-medium">Add me too</span>
        <span className="text-sm text-muted">
          {owner ? `You and ${star === "Your pet" ? "your pet" : star}, together` : "You and your pet in one portrait"}
        </span>
      </span>
      {owner ? (
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={owner.url} alt="Your photo" className="h-11 w-11 rounded-full object-cover" />
          <button
            onClick={() => {
              URL.revokeObjectURL(owner.url);
              setOwner(null);
            }}
            className="min-h-11 px-2 text-sm text-muted underline underline-offset-4"
          >
            Remove
          </button>
        </span>
      ) : (
        <button onClick={() => input.current?.click()} className="min-h-11 rounded-full border border-line px-4 text-sm font-medium">
          Add a photo
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="owner-input"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const blob = await prepareUpload(file).catch(() => null);
          if (blob) setOwner({ blob, url: URL.createObjectURL(blob) });
        }}
      />
    </div>
  );
}

function PhotoStep({ current, onPicked, onBack, album }: { current: Upload | null; onPicked: (u: Upload) => void; onBack?: () => void; album: Photo[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState<{ upload: Upload; problem: PhotoProblem } | null>(null);
  const [failed, setFailed] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setChecking(true);
    setFailed(false);
    try {
      const [{ problem }, blob] = await Promise.all([checkPhoto(file), prepareUpload(file)]);
      const upload = { blob, url: URL.createObjectURL(blob) };
      if (problem) {
        track("photo_rejected");
        setPending({ upload, problem });
      } else onPicked(upload);
    } catch {
      setFailed(true);
    } finally {
      setChecking(false);
    }
  }

  const chooser = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      className="hidden"
      data-testid="pet-input"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        void pick(file);
      }}
    />
  );

  if (pending) {
    return (
      <section className="px-6 pb-10 pt-6 text-center">
        <div className="print mx-auto w-44 -rotate-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pending.upload.url} alt="The photo you chose" className="aspect-square w-full object-cover" />
        </div>
        <h1 className="font-display mt-8 text-[2rem] leading-tight">Maybe another one?</h1>
        <p className="mx-auto mt-2 max-w-[32ch] text-muted">{PROBLEM_TEXT[pending.problem]}</p>
        <button
          onClick={() => {
            URL.revokeObjectURL(pending.upload.url);
            setPending(null);
            input.current?.click();
          }}
          className="mt-8 flex min-h-14 w-full items-center justify-center rounded-full bg-accent text-lg font-medium text-accent-ink active:scale-[0.98]"
        >
          Choose another photo
        </button>
        <button
          onClick={() => {
            track("photo_used_anyway");
            onPicked(pending.upload);
          }}
          className="mt-2 min-h-12 w-full text-muted underline underline-offset-4"
        >
          Use this one anyway
        </button>
        {chooser}
      </section>
    );
  }

  return (
    <section className="px-6 pb-10 pt-4">
      <h1 className="font-display text-[2.4rem] leading-[1.05]">
        Who&apos;s the <span className="font-script text-[3rem] text-accent">star</span>?
      </h1>
      <p className="mt-2 text-muted">One clear photo of their face works best.</p>

      <div className="mt-6 grid grid-cols-4 gap-2.5">
        <Tip good label="Clear face" />
        <Tip good label="Daylight" light />
        <Tip label="Blurry" look="blur(2.5px)" />
        <Tip label="Too dark" look="brightness(0.3)" />
      </div>

      <button
        onClick={() => input.current?.click()}
        disabled={checking}
        className="mt-8 flex min-h-14 w-full items-center justify-center rounded-full bg-accent text-lg font-medium text-accent-ink transition active:scale-[0.98] disabled:opacity-60"
      >
        {checking ? "Looking at the photo" : "Choose from Photos"}
      </button>
      {failed && (
        <p role="alert" className="mt-3 text-center text-accent">
          That photo couldn&apos;t be opened. Try a JPG or PNG.
        </p>
      )}
      {onBack && current && (
        <button onClick={onBack} className="mt-3 min-h-11 w-full text-muted underline underline-offset-4">
          Keep the current photo
        </button>
      )}
      {album.length > 0 && (
        <>
          <h2 className="font-display mt-8 italic">Or one from the album</h2>
          <div className="-mx-6 mt-3 flex gap-3 overflow-x-auto px-6 pb-2">
            {album.slice(0, 24).map((p) => (
              <button
                key={p.id}
                disabled={checking}
                onClick={async () => {
                  setChecking(true);
                  try {
                    const blob = await (await fetch(p.full)).blob();
                    await pick(new File([blob], "album.jpg", { type: blob.type || "image/jpeg" }));
                  } catch {
                    setFailed(true);
                    setChecking(false);
                  }
                }}
                className="w-20 shrink-0 bg-[#fbf8f2] p-1 shadow-[0_6px_12px_-8px_var(--shadow)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted">Only the photo you pick is used. Nothing else in your library is read.</p>
      {chooser}
    </section>
  );
}

function Tip({ label, good = false, look, light = false }: { label: string; good?: boolean; look?: string; light?: boolean }) {
  return (
    <figure className="text-center">
      <div
        className={`arch relative flex aspect-[3/4] items-end justify-center overflow-hidden ${light ? "bg-[#f3dcb4]" : "bg-blue"}`}
        style={look ? { filter: look } : undefined}
      >
        <Mascot size={62} still className="mb-[6%]" />
      </div>
      <figcaption className="mt-1.5 flex items-center justify-center gap-1 text-[0.8rem] leading-tight">
        {good ? (
          <CheckCircle size={16} weight="fill" className="shrink-0 text-[#3d6b45]" aria-label="Good:" />
        ) : (
          <XCircle size={16} weight="fill" className="shrink-0 text-accent" aria-label="Avoid:" />
        )}
        {label}
      </figcaption>
    </figure>
  );
}

function DevelopStep({ photo, phase, memorial }: { photo: string | null; phase: UploadPhase | { kind: "drying" }; memorial: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const order = ["loading", "developing", "drying"] as const;
  const at = order.indexOf(phase.kind);
  const steps = [
    {
      label: "Loading the film",
      detail: phase.kind === "loading" ? (phase.progress > 0 ? `${Math.round(phase.progress * 100)}% sent` : "Sending your photo") : null,
    },
    { label: "Developing", detail: phase.kind === "developing" ? `${seconds}s, usually 20 to 40` : null },
    { label: "Drying the print", detail: null },
  ];

  return (
    <section className="flex min-h-[72dvh] flex-col items-center px-6 pb-10 pt-6" aria-live="polite">
      <div className="relative w-52">
        <div className="print -rotate-1">
          <div className="grain overflow-hidden bg-[#1f140d]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo && <img src={photo} alt="" className="negative aspect-[4/5] w-full object-cover" />}
          </div>
        </div>
        <Mascot mood="working" size={96} className="absolute -bottom-8 -right-12" />
      </div>

      <h1 className="font-display mt-12 text-center text-[2rem] leading-tight">
        {memorial ? "Taking our time with this one" : "In the darkroom"}
      </h1>
      <p className="mt-1 text-center text-muted">{MASCOT} is looking after it. Keep the app open.</p>

      <ol className="mt-8 w-full max-w-xs space-y-4">
        {steps.map((s, i) => {
          const done = i < at;
          const active = i === at;
          return (
            <li key={s.label} className={`flex items-center gap-3 ${done || active ? "text-ink" : "text-muted"}`}>
              {done ? (
                <CheckCircle size={24} weight="fill" className="shrink-0 text-accent" />
              ) : active ? (
                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                  <span className="absolute h-6 w-6 animate-ping rounded-full bg-accent/25 motion-reduce:animate-none" />
                  <span className="h-3 w-3 rounded-full bg-accent" />
                </span>
              ) : (
                <Circle size={24} className="shrink-0" />
              )}
              <span>
                <span className={`block ${active ? "font-medium" : ""}`}>{s.label}</span>
                {active && s.detail && <span className="text-sm text-muted">{s.detail}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function RevealStep({
  portrait,
  onKeep,
  onShare,
  onAnother,
  onOpenAlbum,
}: {
  portrait: Portrait;
  onKeep: () => void;
  onShare: () => void;
  onAnother: () => void;
  onOpenAlbum: () => void;
}) {
  const s = findStyle(portrait.style)!;
  return (
    <section className="px-6 pb-10 pt-4 text-center">
      <div className="print mx-auto w-[82%] max-w-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portrait.preview} alt={`${starName(portrait.petName)} in ${s.title}`} className="develop block w-full" />
      </div>

      <div className="rise mt-7" style={{ animationDelay: "1.6s" }}>
        {portrait.memorial && <p className="font-display italic text-muted">In loving memory of</p>}
        <p className="font-script text-[3.2rem] leading-[1.1]">{starName(portrait.petName)}</p>
        <p className="font-display text-lg italic">
          in {s.title}, {s.year}
        </p>
      </div>
      {portrait.mock && (
        <p className="mt-3 text-sm text-muted">Demo mode: there&apos;s no image key yet, so this is your own photo.</p>
      )}

      <div className="rise mt-7 grid gap-3" style={{ animationDelay: "2s" }}>
        {portrait.unlocked ? (
          <a
            href={downloadUrl(portrait.id)}
            download
            className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-accent text-lg font-medium text-accent-ink"
          >
            <DownloadSimple size={20} weight="bold" /> Save in HD
          </a>
        ) : (
          <button
            onClick={onKeep}
            className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-accent text-lg font-medium text-accent-ink active:scale-[0.98]"
          >
            <DownloadSimple size={20} weight="bold" /> {portrait.memorial ? "Keep it in HD" : "Save in HD"}
          </button>
        )}
        <button
          onClick={onShare}
          className="flex min-h-14 items-center justify-center gap-2 rounded-full border border-ink/25 text-lg font-medium active:scale-[0.98]"
        >
          <ShareNetwork size={20} /> Share
        </button>
        <button onClick={onAnother} className="inline-flex min-h-12 items-center justify-center gap-2 text-muted underline underline-offset-4">
          <ArrowCounterClockwise size={18} /> Try another era
        </button>
        <button onClick={onOpenAlbum} className="min-h-11 text-sm text-muted">
          It&apos;s already in your album
        </button>
      </div>
    </section>
  );
}
