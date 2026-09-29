"use client";

import { strToU8, zipSync } from "fflate";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND, formatUsd, LIMITS, PRO } from "@/lib/config";
import { renderSlide, SLIDE_H, SLIDE_W, type Fonts } from "@/lib/render";
import { byHeat, findTemplate, type Template, type ThemeId } from "@/lib/templates";

const TOKEN_KEY = "slidedrop_token";
const THEMES: { id: ThemeId; name: string }[] = [
  { id: "caption", name: "TikTok caption" },
  { id: "bold", name: "Bold outline" },
  { id: "notes", name: "Notes app" },
  { id: "minimal", name: "Minimal serif" },
];

const ERRORS: Record<string, string> = {
  limit_reached: "You've used today's free AI slideshows. Go Pro, or edit the slides by hand (always free).",
  refused: "The AI couldn't write about that topic. Try rewording it.",
  generation_failed: "Writing failed and didn't count against your limit. Try again.",
  bad_request: "Add a topic first.",
  not_configured: "Payments aren't set up yet.",
  generic: "Something went wrong. Please try again.",
};

type Background = { bitmap: ImageBitmap; url: string };

function readToken() {
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
    // Private mode: works for this visit only.
  }
}

// The canvas can only use a web font once it has loaded; next/font exposes
// the real family names through CSS variables on <html>.
async function loadFonts(): Promise<Fonts> {
  const css = getComputedStyle(document.documentElement);
  const sans = css.getPropertyValue("--font-montserrat").trim() || "sans-serif";
  const serif = css.getPropertyValue("--font-fraunces").trim() || "serif";
  await Promise.all([
    document.fonts.load(`800 64px ${sans}`),
    document.fonts.load(`700 64px ${sans}`),
    document.fonts.load(`400 64px ${sans}`),
    document.fonts.load(`600 64px ${serif}`),
  ]).catch(() => undefined);
  return { sans, serif };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), type, quality),
  );
}

function download(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

export function Editor() {
  const [template, setTemplate] = useState<Template>(byHeat()[0]);
  const [theme, setTheme] = useState<ThemeId>(byHeat()[0].theme);
  const [topic, setTopic] = useState("");
  const [promote, setPromote] = useState("");
  const [slides, setSlides] = useState<string[]>(byHeat()[0].example.slides);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);

  const [fonts, setFonts] = useState<Fonts | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [pro, setPro] = useState(false);
  const [freeLeft, setFreeLeft] = useState<number | null>(null);

  const [writing, setWriting] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (tok: string | null) => {
    const res = await fetch("/api/account", { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
    if (!res.ok) return null;
    const data = (await res.json()) as { invalidToken: boolean; pro: boolean; freeLeft: number };
    if (data.invalidToken) writeToken(null);
    else setToken(tok);
    setPro(data.pro);
    setFreeLeft(data.freeLeft);
    return data;
  }, []);

  const upgrade = useCallback(async (tok: string | null) => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; token?: string; error?: string };
    if (!res.ok || !data.url) {
      setError(ERRORS[data.error ?? "generic"] ?? ERRORS.generic);
      return;
    }
    if (data.token) writeToken(data.token);
    window.location.assign(data.url);
  }, []);

  function chooseTemplate(next: Template) {
    setTemplate(next);
    setTheme(next.theme);
    setSlides(next.example.slides);
    setCaption("");
    setHashtags([]);
    setMock(false);
  }

  // First load: fonts for the canvas, the template from the gallery link, an
  // access link (#k=...), and returns from Stripe.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("k")) writeToken(hash.get("k"));
    const tok = readToken();
    if (query.toString() || window.location.hash) history.replaceState(null, "", window.location.pathname);

    void (async () => {
      const initial = findTemplate(query.get("t"));
      if (initial) chooseTemplate(initial);
      setFonts(await loadFonts());
      const account = await refresh(tok);
      if (query.has("upgrade") && !account?.pro) {
        await upgrade(tok);
        return;
      }
      if (query.has("pro")) {
        setNotice("Payment received! Activating Pro…");
        for (let i = 0; i < 10; i++) {
          const next = await refresh(tok);
          if (next?.pro) {
            setNotice("You're Pro. Unlimited AI slideshows, no watermark.");
            setShowAccess(true);
            return;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        setNotice("Payment received. Pro will switch on in a moment; refresh if it doesn't.");
      }
    })();
  }, [refresh, upgrade]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, index: number) => {
      if (!fonts) return;
      const bg = theme === "notes" || backgrounds.length === 0 ? undefined : backgrounds[index % backgrounds.length].bitmap;
      renderSlide(ctx, {
        text: slides[index],
        index,
        total: slides.length,
        theme,
        image: bg,
        fonts,
        watermark: !pro && index === slides.length - 1 ? `made with ${BRAND}` : undefined,
      });
    },
    [fonts, theme, backgrounds, slides, pro],
  );

  // Small previews, redrawn shortly after the last edit.
  useEffect(() => {
    if (!fonts) return;
    const timer = setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = SLIDE_W / 4;
      canvas.height = SLIDE_H / 4;
      const ctx = canvas.getContext("2d")!;
      const urls = slides.map((_, i) => {
        ctx.setTransform(0.25, 0, 0, 0.25, 0, 0);
        draw(ctx, i);
        return canvas.toDataURL("image/jpeg", 0.8);
      });
      setPreviews(urls);
    }, 150);
    return () => clearTimeout(timer);
  }, [fonts, slides, draw]);

  async function renderAll(type: "image/png" | "image/jpeg"): Promise<Blob[]> {
    const canvas = document.createElement("canvas");
    canvas.width = SLIDE_W;
    canvas.height = SLIDE_H;
    const ctx = canvas.getContext("2d")!;
    const blobs: Blob[] = [];
    for (let i = 0; i < slides.length; i++) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      draw(ctx, i);
      blobs.push(await canvasToBlob(canvas, type, 0.92));
    }
    return blobs;
  }

  async function write() {
    if (writing) return;
    setError(null);
    setNotice(null);
    if (!topic.trim()) {
      setError(ERRORS.bad_request);
      return;
    }
    setWriting(true);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ templateId: template.id, topic, promote, slideCount: template.slides }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        slides?: string[];
        caption?: string;
        hashtags?: string[];
        mock?: boolean;
        error?: string;
      };
      if (!res.ok || !data.slides) {
        setError(ERRORS[data.error ?? "generic"] ?? ERRORS.generic);
        return;
      }
      setSlides(data.slides);
      setCaption(data.caption ?? "");
      setHashtags(data.hashtags ?? []);
      setMock(Boolean(data.mock));
      if (!pro) setFreeLeft((n) => (n === null ? n : Math.max(0, n - 1)));
    } catch {
      setError(ERRORS.generic);
    } finally {
      setWriting(false);
    }
  }

  async function addBackgrounds(files: FileList | null) {
    if (!files) return;
    const added: Background[] = [];
    for (const file of Array.from(files).slice(0, LIMITS.maxSlides)) {
      try {
        added.push({ bitmap: await createImageBitmap(file), url: URL.createObjectURL(file) });
      } catch {
        setError("One of those files isn't an image we can read.");
      }
    }
    setBackgrounds((prev) => [...prev, ...added].slice(0, LIMITS.maxSlides));
  }

  function removeBackground(i: number) {
    setBackgrounds((prev) => {
      URL.revokeObjectURL(prev[i].url);
      prev[i].bitmap.close();
      return prev.filter((_, j) => j !== i);
    });
  }

  const fullCaption = [caption, hashtags.map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");

  async function exportZip() {
    setWorking(true);
    try {
      const blobs = await renderAll("image/png");
      const files: Record<string, Uint8Array> = {};
      for (let i = 0; i < blobs.length; i++) {
        files[`slide-${String(i + 1).padStart(2, "0")}.png`] = new Uint8Array(await blobs[i].arrayBuffer());
      }
      if (fullCaption) files["caption.txt"] = strToU8(fullCaption);
      const zip = zipSync(files, { level: 0 });
      download(new Blob([zip.slice().buffer], { type: "application/zip" }), `${template.id}-slides.zip`);
    } finally {
      setWorking(false);
    }
  }

  async function sendToDrafts() {
    setWorking(true);
    setError(null);
    try {
      const blobs = await renderAll("image/jpeg");
      const form = new FormData();
      blobs.forEach((b, i) => form.append("slide", b, `slide-${i + 1}.jpg`));
      form.append("caption", fullCaption);
      const res = await fetch("/api/post", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) setError(ERRORS.generic);
      else setNotice(data.message ?? "Sent.");
    } finally {
      setWorking(false);
    }
  }

  const accessLink = token && typeof window !== "undefined" ? `${window.location.origin}/editor#k=${token}` : "";

  return (
    <>
      <SiteHeader
        right={
          freeLeft !== null && (
            <>
              {pro ? (
                <button onClick={() => setShowAccess(true)} className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent">
                  Pro ✓
                </button>
              ) : (
                <>
                  <span className="hidden rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent sm:inline">
                    {freeLeft} free AI {freeLeft === 1 ? "write" : "writes"} left today
                  </span>
                  <button onClick={() => void upgrade(token)} className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink">
                    Go Pro · {formatUsd(PRO.price)}/mo
                  </button>
                </>
              )}
            </>
          )
        }
      />

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 lg:grid-cols-[380px_1fr]">
        <section className="space-y-5">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Format</span>
            <select
              value={template.id}
              onChange={(e) => chooseTemplate(findTemplate(e.target.value)!)}
              className="w-full rounded-xl border border-line bg-card px-3 py-2.5"
            >
              {byHeat().map((t) => (
                <option key={t.id} value={t.id}>
                  🔥 {t.heat} · {t.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted">{template.whyItWorks}</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Topic</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={LIMITS.maxTopicChars}
              placeholder={`e.g. ${template.example.topic}`}
              className="w-full rounded-xl border border-line bg-card px-3 py-2.5"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">
              Feature a product <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              value={promote}
              onChange={(e) => setPromote(e.target.value)}
              maxLength={LIMITS.maxTopicChars}
              placeholder="e.g. Merry Paws: turns your pet into a Christmas portrait"
              className="w-full rounded-xl border border-line bg-card px-3 py-2.5"
            />
          </label>

          <button
            onClick={() => void write()}
            disabled={writing}
            className="w-full rounded-xl bg-accent px-6 py-3.5 font-semibold text-accent-ink disabled:opacity-50"
          >
            {writing ? "Writing…" : "✨ Write it with AI"}
          </button>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Look</legend>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  aria-pressed={theme === t.id}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${theme === t.id ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-card"}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="mb-2 text-sm font-semibold">
              Background photos <span className="font-normal text-muted">(used in order, repeating)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {backgrounds.map((b, i) => (
                <button key={b.url} onClick={() => removeBackground(i)} title="Remove" className="relative h-16 w-12 overflow-hidden rounded-md border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.url} alt="" className="h-full w-full object-cover" />
                  <span className="absolute right-0 top-0 bg-black/60 px-1 text-[10px] text-white">✕</span>
                </button>
              ))}
              <button
                onClick={() => fileInput.current?.click()}
                className="flex h-16 w-12 items-center justify-center rounded-md border border-dashed border-line bg-card text-xl text-muted"
                aria-label="Add background photos"
              >
                +
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                data-testid="bg-input"
                onChange={(e) => void addBackgrounds(e.target.files)}
              />
            </div>
            {theme === "notes" && <p className="mt-1 text-xs text-muted">The Notes look doesn&apos;t use photos.</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
              {error}
            </p>
          )}
        </section>

        <section className="min-w-0 space-y-6">
          {notice && <p className="rounded-xl bg-accent-soft p-3 text-sm text-accent">{notice}</p>}
          {mock && <p className="text-xs text-warn">Demo mode: ANTHROPIC_API_KEY is not set, so you&apos;re seeing the format&apos;s example.</p>}

          <div className="flex gap-3 overflow-x-auto pb-2">
            {slides.map((_, i) => (
              <div key={i} className="w-36 shrink-0">
                {previews[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[i]} alt={`Slide ${i + 1}`} className="aspect-[9/16] w-full rounded-lg border border-line" />
                ) : (
                  <div className="aspect-[9/16] w-full animate-pulse rounded-lg bg-line" />
                )}
                <p className="mt-1 text-center text-xs text-muted">{i + 1}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Slide text</p>
            {slides.map((text, i) => (
              <div key={i} className="flex gap-2">
                <span className="w-6 pt-2 text-right text-xs text-muted">{i + 1}</span>
                <textarea
                  value={text}
                  rows={2}
                  aria-label={`Slide ${i + 1} text`}
                  onChange={(e) => setSlides((prev) => prev.map((s, j) => (j === i ? e.target.value : s)))}
                  className="flex-1 resize-y rounded-lg border border-line bg-card px-3 py-2 text-sm"
                />
                <button
                  onClick={() => setSlides((prev) => prev.filter((_, j) => j !== i))}
                  disabled={slides.length <= 1}
                  aria-label={`Remove slide ${i + 1}`}
                  className="px-2 text-muted hover:text-ink disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
            {slides.length < LIMITS.maxSlides && (
              <button onClick={() => setSlides((prev) => [...prev, "New slide"])} className="ml-8 text-sm font-medium text-accent">
                + Add slide
              </button>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Caption</span>
            <textarea
              value={fullCaption}
              rows={3}
              onChange={(e) => {
                setCaption(e.target.value);
                setHashtags([]);
              }}
              placeholder="Your TikTok caption and hashtags"
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void exportZip()}
              disabled={working || !fonts}
              className="rounded-xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              Download slides (.zip)
            </button>
            <button
              onClick={() => void sendToDrafts()}
              disabled={working || !fonts}
              className="rounded-xl border border-ink/15 bg-card px-5 py-3 font-semibold disabled:opacity-50"
            >
              Send to TikTok drafts (demo)
            </button>
            <button
              onClick={() => void navigator.clipboard.writeText(fullCaption)}
              disabled={!fullCaption}
              className="rounded-xl border border-ink/15 bg-card px-5 py-3 font-semibold disabled:opacity-50"
            >
              Copy caption
            </button>
          </div>
          <p className="text-xs text-muted">
            Tip: upload the slides as a TikTok photo post and add a trending sound. The sound matters as much as the slides.
          </p>
        </section>
      </main>

      {showAccess && token && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setShowAccess(false)}>
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAccess(false)} aria-label="Close" className="absolute right-4 top-4 text-muted hover:text-ink">
              ✕
            </button>
            <h2 className="text-2xl font-extrabold">Your Pro access link</h2>
            <p className="mt-1 text-sm text-muted">Pro is tied to this browser. Open this link on your phone or another computer to use it there.</p>
            <p className="mt-4 break-all rounded-lg bg-paper p-3 font-mono text-xs">{accessLink}</p>
            <button
              onClick={() => void navigator.clipboard.writeText(accessLink)}
              className="mt-4 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-ink"
            >
              Copy link
            </button>
          </div>
        </div>
      )}
    </>
  );
}
