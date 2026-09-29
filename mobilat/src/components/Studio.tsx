"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BeforeAfter } from "@/components/BeforeAfter";
import { SiteHeader } from "@/components/SiteHeader";
import { currencyFor, formatPrice, PLANS, type Locale, type PlanId } from "@/lib/config";
import { getDictionary } from "@/lib/i18n";
import { downloadResult, prepareUpload, sameOriginSrc } from "@/lib/image";
import { MODES, ROOMS, STYLES, type Mode, type Room, type Style } from "@/lib/prompts";

const TOKEN_KEY = "mobilat_token";
const PLAN_ORDER: PlanId[] = ["starter", "agent", "pro"];

type Result = { id: number; before: string; after: string; mock: boolean };
type ErrorKey = keyof ReturnType<typeof getDictionary>["studio"]["errors"];

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode: the access link still works for this session.
  }
}

export function Studio({ lang }: { lang: Locale }) {
  const t = getDictionary(lang).studio;
  const pricing = getDictionary(lang).pricing;
  const currency = currencyFor(lang);

  const [token, setToken] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [freeLeft, setFreeLeft] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [upload, setUpload] = useState<{ blob: Blob; preview: string } | null>(null);
  const [mode, setMode] = useState<Mode>("stage");
  const [room, setRoom] = useState<Room>("living");
  const [style, setStyle] = useState<Style>("modern");
  const [label, setLabel] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [showPricing, setShowPricing] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (tok: string | null) => {
    const res = await fetch("/api/account", { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
    if (!res.ok) return null;
    const data = (await res.json()) as { account: boolean; invalidToken?: boolean; credits: number; freeLeft: number };
    if (data.invalidToken) {
      writeToken(null);
      setToken(null);
    }
    setCredits(data.credits);
    setFreeLeft(data.freeLeft);
    setLoaded(true);
    return data;
  }, []);

  const startCheckout = useCallback(
    async (plan: PlanId, tok: string | null) => {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ plan, lang }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; token?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error === "not_configured" ? "not_configured" : "generic");
        return;
      }
      if (data.token) writeToken(data.token);
      window.location.href = data.url;
    },
    [lang],
  );

  // First load: pick up a token from the access link (#k=...), the stored
  // one, and handle ?paid / ?buy coming back from Stripe or the landing page.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const fromLink = hash.get("k");
    if (fromLink) {
      writeToken(fromLink);
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const tok = fromLink ?? readToken();

    const query = new URLSearchParams(window.location.search);
    const buy = query.get("buy") as PlanId | null;
    const paid = query.has("paid");
    if (paid || buy || query.has("canceled")) history.replaceState(null, "", window.location.pathname);

    void (async () => {
      const first = await refresh(tok);
      if (!first?.invalidToken) setToken(tok);
      if (buy && PLANS[buy]) {
        await startCheckout(buy, tok);
        return;
      }
      if (paid) {
        setNotice(t.paid);
        setShowAccess(true);
        // The webhook can land a moment after the redirect.
        const start = first?.credits ?? 0;
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const next = await refresh(tok);
          if (next && next.credits > start) break;
        }
      }
    })();
  }, [refresh, startCheckout, t.paid]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const blob = await prepareUpload(file);
      if (upload) URL.revokeObjectURL(upload.preview);
      setUpload({ blob, preview: URL.createObjectURL(blob) });
    } catch {
      setError("bad_type");
    }
  }

  async function generate() {
    if (!upload || busy) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("image", upload.blob, "room.jpg");
    form.append("mode", mode);
    form.append("room", room);
    form.append("style", style);
    try {
      const res = await fetch("/api/stage", {
        method: "POST",
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        mock?: boolean;
        credits?: number;
        error?: ErrorKey;
      };
      if (!res.ok || !data.url) {
        const key = data.error && data.error in t.errors ? data.error : "generic";
        setError(key);
        if (key === "no_credits" || key === "free_used") setShowPricing(true);
        return;
      }
      setResults((prev) => [{ id: Date.now(), before: upload.preview, after: data.url!, mock: Boolean(data.mock) }, ...prev]);
      if (typeof data.credits === "number") setCredits(data.credits);
      else setFreeLeft((n) => Math.max(0, n - 1));
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
    }
  }

  const accessLink = token && typeof window !== "undefined" ? `${window.location.origin}/${lang}/studio#k=${token}` : "";
  const latest = results[0];

  return (
    <>
      <SiteHeader
        lang={lang}
        switchHref={`/${lang === "ro" ? "en" : "ro"}/studio`}
        right={
          loaded && (
            <>
              <button
                onClick={() => (token ? setShowAccess(true) : setShowPricing(true))}
                className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent"
              >
                {token ? t.credits(credits) : t.free(freeLeft)}
              </button>
              <button
                onClick={() => setShowPricing(true)}
                className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink"
              >
                {t.buy}
              </button>
            </>
          )
        }
      />

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 lg:grid-cols-[380px_1fr]">
        <section className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void onFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInput.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-line bg-card p-4 text-center hover:border-accent"
          >
            {upload ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={upload.preview} alt="" className="mx-auto max-h-52 rounded-lg" />
                <p className="mt-3 text-sm font-medium text-accent">{t.change}</p>
              </>
            ) : (
              <div className="py-8">
                <p className="text-3xl">📷</p>
                <p className="mt-2 font-semibold">{t.upload}</p>
                <p className="mt-1 text-sm text-muted">{t.uploadHint}</p>
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </div>

          <Choice title={t.mode} options={MODES} labels={t.modes} value={mode} onChange={setMode} wide />
          <Choice title={t.room} options={ROOMS} labels={t.rooms} value={room} onChange={setRoom} />
          {mode !== "empty" && (
            <Choice title={t.style} options={STYLES} labels={t.styles} value={style} onChange={setStyle} />
          )}

          <button
            onClick={() => void generate()}
            disabled={!upload || busy}
            className="w-full rounded-xl bg-accent px-6 py-3.5 font-semibold text-accent-ink disabled:opacity-40"
          >
            {busy ? "…" : t.generate}
          </button>

          {error && (
            <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
              {t.errors[error]}
            </p>
          )}
        </section>

        <section className="min-w-0">
          {notice && <p className="mb-4 rounded-xl bg-accent-soft p-3 text-sm text-accent">{notice}</p>}

          {busy && (
            <div className="flex aspect-[3/2] items-center justify-center rounded-2xl border border-line bg-card p-6 text-center text-muted">
              <div>
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-accent-soft border-t-accent" />
                {t.generating}
              </div>
            </div>
          )}

          {!busy && latest && (
            <div>
              <BeforeAfter
                before={latest.before}
                after={sameOriginSrc(latest.after)}
                beforeLabel={getDictionary(lang).hero.before}
                afterLabel={getDictionary(lang).hero.after}
              />
              {latest.mock && <p className="mt-2 text-xs text-warn">{t.mockNote}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => void downloadResult(latest.after, `mobilat-${latest.id}.jpg`, label ? t.labelText : undefined)}
                  className="rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink"
                >
                  {t.download}
                </button>
                <button onClick={() => void generate()} className="rounded-xl border border-ink/15 bg-card px-5 py-3 font-semibold">
                  {t.again}
                </button>
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" checked={label} onChange={(e) => setLabel(e.target.checked)} />
                  {t.label}
                </label>
              </div>
            </div>
          )}

          {!busy && !latest && (
            <div className="rounded-2xl border border-line bg-card p-3">
              <BeforeAfter
                before="/demo/before.svg"
                after="/demo/after.svg"
                beforeLabel={getDictionary(lang).hero.before}
                afterLabel={getDictionary(lang).hero.after}
              />
            </div>
          )}

          {results.length > 1 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-muted">{t.history}</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {results.slice(1).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setResults((prev) => [r, ...prev.filter((p) => p.id !== r.id)])}
                    className="overflow-hidden rounded-lg border border-line"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sameOriginSrc(r.after)} alt="" className="aspect-[3/2] w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {showPricing && (
        <Modal onClose={() => setShowPricing(false)} closeLabel={t.close}>
          <h2 className="font-display text-2xl font-semibold">{pricing.title}</h2>
          <p className="mt-1 text-sm text-muted">{pricing.subtitle}</p>
          <div className="mt-5 space-y-3">
            {PLAN_ORDER.map((id) => {
              const plan = PLANS[id];
              return (
                <button
                  key={id}
                  onClick={() => void startCheckout(id, token)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left hover:border-accent ${id === "agent" ? "border-accent" : "border-line"}`}
                >
                  <span>
                    <span className="block font-semibold">{pricing.plans[id].name}</span>
                    <span className="block text-sm text-muted">{pricing.plans[id].desc}</span>
                  </span>
                  <span className="text-right font-bold">
                    {formatPrice(plan.price[currency], currency)}
                    {plan.mode === "subscription" && <span className="block text-xs font-normal text-muted">{pricing.perMonth}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {showAccess && token && (
        <Modal onClose={() => setShowAccess(false)} closeLabel={t.close}>
          <h2 className="font-display text-2xl font-semibold">{t.accessTitle}</h2>
          <p className="mt-1 text-sm text-muted">{t.accessText}</p>
          <p className="mt-4 break-all rounded-lg bg-paper p-3 font-mono text-xs">{accessLink}</p>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(accessLink).then(() => setCopied(true));
            }}
            className="mt-4 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-ink"
          >
            {copied ? t.copied : t.copy}
          </button>
        </Modal>
      )}
    </>
  );
}

function Choice<T extends string>({
  title,
  options,
  labels,
  value,
  onChange,
  wide,
}: {
  title: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
  wide?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      <div className={`grid gap-2 ${wide ? "grid-cols-1" : "grid-cols-2"}`}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(o)}
            className={`rounded-lg border px-3 py-2 text-left text-sm ${value === o ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-card"}`}
          >
            {labels[o]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Modal({ children, onClose, closeLabel }: { children: React.ReactNode; onClose: () => void; closeLabel: string }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label={closeLabel} className="absolute right-4 top-4 text-muted hover:text-ink">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
