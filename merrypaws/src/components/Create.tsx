"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { StyleArt } from "@/components/StyleCard";
import { formatUsd, PLAN_ORDER, PLANS, type PlanId } from "@/lib/config";
import { prepareUpload } from "@/lib/image";
import { findStyle, STYLES, type StyleId } from "@/lib/styles";

const TOKEN_KEY = "merrypaws_token";
const PORTRAITS_KEY = "merrypaws_portraits";

type Portrait = { id: string; style: StyleId; preview: string; unlocked: boolean; mock?: boolean };
type Upload = { blob: Blob; url: string };

const ERRORS: Record<string, string> = {
  limit_reached: "You've used today's free previews. Unlock one you like, or come back tomorrow.",
  generation_failed: "That didn't work. Nothing was charged, please try again.",
  bad_request: "Please use a JPG, PNG or WEBP photo.",
  no_credits: "Pick a pack to unlock this portrait.",
  expired: "This preview has expired. Make a new one.",
  not_configured: "Payments aren't set up yet.",
  generic: "Something went wrong. Please try again.",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    // Storage full or blocked: the page still works for this visit.
  }
}

function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function Create({ samples }: { samples: Record<StyleId, string | null> }) {
  const [token, setToken] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [freeLeft, setFreeLeft] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [pet, setPet] = useState<Upload | null>(null);
  const [owner, setOwner] = useState<Upload | null>(null);
  const [style, setStyle] = useState<StyleId>("fireplace");
  const [portraits, setPortraits] = useState<Portrait[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingFor, setPricingFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const petInput = useRef<HTMLInputElement>(null);
  const ownerInput = useRef<HTMLInputElement>(null);

  const selected = portraits.find((p) => p.id === selectedId) ?? portraits[0];

  const updatePortraits = useCallback((fn: (prev: Portrait[]) => Portrait[]) => {
    setPortraits((prev) => {
      const next = fn(prev);
      // Keep the newest few so localStorage stays small.
      save(PORTRAITS_KEY, next.slice(0, 12));
      return next;
    });
  }, []);

  const refresh = useCallback(async (tok: string | null) => {
    const res = await fetch("/api/account", { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
    if (!res.ok) return;
    const data = (await res.json()) as { invalidToken?: boolean; credits: number; freeLeft: number };
    if (data.invalidToken) save(TOKEN_KEY, null);
    else setToken(tok);
    setCredits(data.credits);
    setFreeLeft(data.freeLeft);
    setLoaded(true);
  }, []);

  // First load: restore this browser's previews and account, pick up the style
  // from the landing page, and finish an unlock after returning from Stripe.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paidFor = query.has("paid") ? query.get("portrait") : null;
    const tok = loadToken();

    void (async () => {
      const initial = findStyle(query.get("style"));
      if (initial) setStyle(initial.id);
      const saved = load<Portrait[]>(PORTRAITS_KEY, []);
      setPortraits(saved);
      if (query.toString()) history.replaceState(null, "", window.location.pathname);
      await refresh(tok);

      if (!paidFor) return;
      setSelectedId(paidFor);
      setNotice("Payment received! Unlocking your portrait…");
      // The webhook can land a moment after the redirect.
      for (let i = 0; i < 15; i++) {
        const res = await fetch(`/api/portrait/${paidFor}`);
        const data = (await res.json().catch(() => ({}))) as { unlocked?: boolean };
        if (data.unlocked) {
          updatePortraits((prev) => prev.map((p) => (p.id === paidFor ? { ...p, unlocked: true } : p)));
          setNotice("Unlocked! Download your portrait below.");
          await refresh(tok);
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      setNotice("Payment received. Your credit is ready: press “Unlock” on your portrait.");
      await refresh(tok);
    })();
  }, [refresh, updatePortraits]);

  async function pick(file: File | undefined, set: (u: Upload | null) => void, prev: Upload | null) {
    if (!file) return;
    setError(null);
    try {
      const blob = await prepareUpload(file);
      if (prev) URL.revokeObjectURL(prev.url);
      set({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError(ERRORS.bad_request);
    }
  }

  async function generate() {
    if (!pet || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.append("pet", pet.blob, "pet.jpg");
    if (owner) form.append("owner", owner.blob, "owner.jpg");
    form.append("style", style);
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        preview?: string;
        mock?: boolean;
        error?: string;
      };
      if (!res.ok || !data.id || !data.preview) {
        setError(ERRORS[data.error ?? "generic"] ?? ERRORS.generic);
        return;
      }
      const portrait: Portrait = { id: data.id, style, preview: data.preview, unlocked: false, mock: data.mock };
      updatePortraits((prev) => [portrait, ...prev]);
      setSelectedId(portrait.id);
      if (!token) setFreeLeft((n) => Math.max(0, n - 1));
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy(false);
    }
  }

  async function unlock(id: string) {
    setError(null);
    if (!token || credits < 1) {
      setPricingFor(id);
      return;
    }
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json().catch(() => ({}))) as { credits?: number; error?: string };
    if (!res.ok) {
      if (data.error === "no_credits") setPricingFor(id);
      else setError(ERRORS[data.error ?? "generic"] ?? ERRORS.generic);
      return;
    }
    updatePortraits((prev) => prev.map((p) => (p.id === id ? { ...p, unlocked: true } : p)));
    if (typeof data.credits === "number") setCredits(data.credits);
  }

  async function checkout(plan: PlanId, unlockId: string | null) {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ plan, unlockId }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; token?: string; error?: string };
    if (!res.ok || !data.url) {
      setPricingFor(null);
      setError(ERRORS[data.error ?? "generic"] ?? ERRORS.generic);
      return;
    }
    if (data.token) save(TOKEN_KEY, data.token);
    window.location.assign(data.url);
  }

  const selectedStyle = selected ? findStyle(selected.style) : undefined;

  return (
    <>
      <SiteHeader
        right={
          loaded && (
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent">
              {token && credits > 0
                ? `${credits} portrait credit${credits === 1 ? "" : "s"}`
                : `${freeLeft} free preview${freeLeft === 1 ? "" : "s"} left today`}
            </span>
          )
        }
      />

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 lg:grid-cols-[400px_1fr]">
        <section className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold">1. Your pet</h2>
            <UploadBox
              upload={pet}
              label="Upload a photo of your pet"
              hint="Clear face, good light. JPG, PNG or WEBP."
              onClick={() => petInput.current?.click()}
              onDrop={(f) => void pick(f, setPet, pet)}
            />
            <input
              ref={petInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              data-testid="pet-input"
              onChange={(e) => void pick(e.target.files?.[0], setPet, pet)}
            />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">
              2. You, too? <span className="font-normal text-muted">(optional)</span>
            </h2>
            {owner ? (
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={owner.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <span className="text-sm">You&apos;ll be in the portrait with your pet.</span>
                <button onClick={() => setOwner(null)} className="ml-auto text-sm text-muted hover:text-ink">
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => ownerInput.current?.click()}
                className="w-full rounded-2xl border border-dashed border-line bg-card p-3 text-sm text-muted hover:border-accent"
              >
                + Add a photo of yourself to be in the portrait
              </button>
            )}
            <input
              ref={ownerInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void pick(e.target.files?.[0], setOwner, owner)}
            />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">3. Christmas look</h2>
            <div className="grid grid-cols-4 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  aria-pressed={style === s.id}
                  title={s.name}
                  className={`overflow-hidden rounded-xl border-2 text-left ${style === s.id ? "border-accent" : "border-transparent"}`}
                >
                  <StyleArt style={s} sample={samples[s.id]} />
                  <span className="block truncate px-1 py-1 text-[11px] font-medium">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => void generate()}
            disabled={!pet || busy}
            className="w-full rounded-xl bg-accent px-6 py-3.5 font-semibold text-accent-ink disabled:opacity-40"
          >
            {busy ? "Painting…" : "Create free preview"}
          </button>
          {error && (
            <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
              {error}
            </p>
          )}
        </section>

        <section className="min-w-0">
          {notice && <p className="mb-4 rounded-xl bg-accent-soft p-3 text-sm text-accent">{notice}</p>}

          {busy ? (
            <div className="flex aspect-[4/5] max-h-[70vh] items-center justify-center rounded-2xl border border-line bg-card p-6 text-center text-muted">
              <div>
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-accent-soft border-t-accent" />
                Painting your portrait… this usually takes 20–40 seconds.
              </div>
            </div>
          ) : selected ? (
            <div className="mx-auto max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.preview} alt="Portrait preview" className="w-full rounded-2xl border border-line shadow-sm" />
              {selected.mock && (
                <p className="mt-2 text-xs text-warn">Demo mode: FAL_KEY is not set, so your photo is returned unchanged.</p>
              )}
              <p className="mt-3 text-center text-sm text-muted">{selectedStyle?.name}</p>
              <div className="mt-4 grid gap-3">
                {selected.unlocked ? (
                  <a
                    href={`/api/download/${selected.id}`}
                    download
                    className="rounded-xl bg-pine px-5 py-3.5 text-center font-semibold text-white"
                  >
                    Download full resolution
                  </a>
                ) : (
                  <button
                    onClick={() => void unlock(selected.id)}
                    className="rounded-xl bg-accent px-5 py-3.5 font-semibold text-accent-ink"
                  >
                    Unlock without watermark
                    {token && credits > 0 ? " (1 credit)" : ` · from ${formatUsd(PLANS.single.price)}`}
                  </button>
                )}
                <button onClick={() => void generate()} disabled={!pet} className="rounded-xl border border-ink/15 bg-card px-5 py-3 font-semibold disabled:opacity-40">
                  Try again in this look
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-card p-8 text-center text-muted">
              <p className="text-5xl">🐶🎄🐱</p>
              <p className="mt-4">Your portrait previews will appear here.</p>
            </div>
          )}

          {portraits.length > 1 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-muted">Your previews</h2>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {portraits.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`relative overflow-hidden rounded-lg border-2 ${p.id === selected?.id ? "border-accent" : "border-line"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt="" className="aspect-[4/5] w-full object-cover" />
                    {p.unlocked && <span className="absolute right-1 top-1 rounded bg-pine px-1 text-[10px] text-white">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {pricingFor && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setPricingFor(null)}>
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPricingFor(null)} aria-label="Close" className="absolute right-4 top-4 text-muted hover:text-ink">
              ✕
            </button>
            <h2 className="font-display text-2xl font-semibold">Keep this portrait</h2>
            <p className="mt-1 text-sm text-muted">
              This one unlocks right after payment. Extra credits unlock any other preview you make.
            </p>
            <div className="mt-5 space-y-3">
              {PLAN_ORDER.map((id) => {
                const plan = PLANS[id];
                return (
                  <button
                    key={id}
                    onClick={() => void checkout(id, pricingFor)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left hover:border-accent ${id === "trio" ? "border-accent" : "border-line"}`}
                  >
                    <span>
                      <span className="block font-semibold">{plan.name}</span>
                      <span className="block text-sm text-muted">{plan.blurb}</span>
                    </span>
                    <span className="font-bold">{formatUsd(plan.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function UploadBox({
  upload,
  label,
  hint,
  onClick,
  onDrop,
}: {
  upload: Upload | null;
  label: string;
  hint: string;
  onClick: () => void;
  onDrop: (file: File | undefined) => void;
}) {
  return (
    <div
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(e.dataTransfer.files[0]);
      }}
      className="cursor-pointer rounded-2xl border-2 border-dashed border-line bg-card p-4 text-center hover:border-accent"
    >
      {upload ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={upload.url} alt="" className="mx-auto max-h-44 rounded-lg" />
          <p className="mt-2 text-sm font-medium text-accent">Change photo</p>
        </>
      ) : (
        <div className="py-6">
          <p className="text-3xl">📷</p>
          <p className="mt-2 font-semibold">{label}</p>
          <p className="mt-1 text-sm text-muted">{hint}</p>
        </div>
      )}
    </div>
  );
}
