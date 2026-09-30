"use client";

import { strToU8, zipSync } from "fflate";
import { useCallback, useEffect, useRef, useState } from "react";
import { canvasToBlob, download, loadFonts, loadJson, saveJson, shrinkImage } from "@/lib/browser";
import { BRAND, LIMITS } from "@/lib/config";
import { renderSlide, SLIDE_H, SLIDE_W, type Fonts } from "@/lib/render";
import { CURATED_SPECS, type SlideStyle, type TemplateSpec } from "@/lib/spec";

const LIBRARY_KEY = "slidedrop_library";

const ERRORS: Record<string, string> = {
  limit_reached: "Daily AI limit reached. Raise AI_PER_IP_PER_DAY in .env.local if this is your own machine.",
  refused: "Claude declined that. Try different screenshots or a different topic.",
  generation_failed: "The AI call failed and didn't count against your limit. Try again.",
  bad_request: "Something's missing: add a link or screenshots, or pick a format and type a topic.",
  bad_link: "That doesn't look like a TikTok link. Copy it from TikTok's Share → Copy link.",
  link_unavailable: "TikTok didn't return that post. It may be private or deleted. Use screenshots instead.",
  link_no_cover: "Got the caption but not the cover image. Add a screenshot of at least the first slide.",
  bad_handle: "That doesn't look like a username. Type it like @name, or paste the profile link.",
  instagram_not_configured: "Reading Instagram by name needs your Meta token: set IG_USER_ID and IG_ACCESS_TOKEN (README → Copy a creator).",
  instagram_token_expired: "Your Instagram token expired (they last 60 days). Make a new one: README → Copy a creator.",
  instagram_busy: "Instagram's rate limit kicked in. Wait an hour and try again.",
  instagram_failed: "Instagram didn't answer properly. Try again in a minute.",
  creator_not_found: "Instagram only shares business and creator accounts. This one is personal, private, age-restricted or doesn't exist.",
  tiktok_needs_posts: "TikTok doesn't let apps list someone's posts. Paste links to 3–10 of their best slideshows, or add a screenshot of their profile grid.",
  creator_no_images: "Couldn't get any slide images from that account. Add a few screenshots of their slideshows.",
  generic: "Something went wrong. Please try again.",
};

type Background = { bitmap: ImageBitmap; url: string };
type Draft = { spec: TemplateSpec; slides: string[]; caption: string };

const STYLE_OPTIONS: { key: keyof SlideStyle; label: string; values: string[] }[] = [
  { key: "textStyle", label: "Text", values: ["caption-box", "outline", "shadow", "plain", "notes"] },
  { key: "font", label: "Font", values: ["sans-bold", "sans-regular", "serif", "handwritten", "typewriter"] },
  { key: "position", label: "Position", values: ["top", "center", "bottom"] },
  { key: "align", label: "Align", values: ["center", "left"] },
  { key: "textCase", label: "Case", values: ["as-written", "lower", "upper"] },
  { key: "size", label: "Size", values: ["small", "medium", "large"] },
  { key: "background", label: "Background", values: ["photo", "gradient", "solid", "notes"] },
];

function startDraft(spec: TemplateSpec): Draft {
  return { spec, slides: spec.exampleSlides.slice(0, spec.slideCount), caption: "" };
}

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T & { error?: string } };
}

export function Studio() {
  const [library, setLibrary] = useState<TemplateSpec[]>([]);
  const [draft, setDraft] = useState<Draft>(() => startDraft(CURATED_SPECS[0]));
  const [current, setCurrent] = useState(0);
  const [tab, setTab] = useState<"copy" | "creator" | "library">("copy");
  const [platform, setPlatform] = useState<"instagram" | "tiktok">("instagram");
  const [handle, setHandle] = useState("");
  const [postLinks, setPostLinks] = useState("");

  const [shots, setShots] = useState<{ blob: Blob; url: string }[]>([]);
  const [link, setLink] = useState("");
  const [topic, setTopic] = useState("");
  const [promote, setPromote] = useState("");
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [showLook, setShowLook] = useState(false);

  const [fonts, setFonts] = useState<Fonts | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [busy, setBusy] = useState<null | "copy" | "creator" | "write" | "export">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mock, setMock] = useState(false);

  const bigCanvas = useRef<HTMLCanvasElement>(null);
  const shotInput = useRef<HTMLInputElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      setLibrary(loadJson<TemplateSpec[]>(LIBRARY_KEY, []));
      setFonts(await loadFonts());
    })();
  }, []);

  const { spec, slides } = draft;
  const index = Math.min(current, slides.length - 1);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, i: number) => {
      if (!fonts) return;
      const bg = backgrounds.length ? backgrounds[i % backgrounds.length].bitmap : undefined;
      renderSlide(ctx, { text: slides[i] ?? "", index: i, total: slides.length, style: spec.style, image: bg, fonts });
    },
    [fonts, backgrounds, slides, spec.style],
  );

  // Big preview of the current slide, redrawn on every change.
  useEffect(() => {
    const canvas = bigCanvas.current;
    if (!canvas || !fonts) return;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(canvas.width / SLIDE_W, 0, 0, canvas.height / SLIDE_H, 0, 0);
    draw(ctx, index);
  }, [draw, index, fonts]);

  // Thumbnails, shortly after the last edit.
  useEffect(() => {
    if (!fonts) return;
    const timer = setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = SLIDE_W / 8;
      canvas.height = SLIDE_H / 8;
      const ctx = canvas.getContext("2d")!;
      setThumbs(
        slides.map((_, i) => {
          ctx.setTransform(1 / 8, 0, 0, 1 / 8, 0, 0);
          draw(ctx, i);
          return canvas.toDataURL("image/jpeg", 0.7);
        }),
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [fonts, slides, draw]);

  function saveToLibrary(next: TemplateSpec) {
    setLibrary((prev) => {
      const updated = [next, ...prev.filter((s) => s.id !== next.id)].slice(0, 50);
      saveJson(LIBRARY_KEY, updated);
      return updated;
    });
  }

  function deleteFromLibrary(id: string) {
    setLibrary((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveJson(LIBRARY_KEY, updated);
      return updated;
    });
  }

  function selectSpec(next: TemplateSpec) {
    setDraft(startDraft(next));
    setCurrent(0);
    setMock(false);
  }

  function updateStyle(key: keyof SlideStyle, value: string) {
    setDraft((d) => {
      const nextSpec = { ...d.spec, style: { ...d.spec.style, [key]: value } };
      if (nextSpec.source === "copied") saveToLibrary(nextSpec);
      return { ...d, spec: nextSpec };
    });
  }

  function setSlideText(i: number, text: string) {
    setDraft((d) => ({ ...d, slides: d.slides.map((s, j) => (j === i ? text : s)) }));
  }

  async function addShots(files: FileList | null) {
    if (!files) return;
    setError(null);
    const added: { blob: Blob; url: string }[] = [];
    for (const file of Array.from(files).slice(0, LIMITS.maxSlides)) {
      try {
        const blob = await shrinkImage(file);
        added.push({ blob, url: URL.createObjectURL(blob) });
      } catch {
        setError("One of those files isn't an image we can read.");
      }
    }
    setShots((prev) => [...prev, ...added].slice(0, LIMITS.maxSlides));
  }

  async function copyFormat() {
    if ((shots.length === 0 && !link.trim()) || busy) return;
    setBusy("copy");
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      if (link.trim()) form.append("link", link.trim());
      shots.forEach((s, i) => form.append("screenshot", s.blob, `shot-${i}.jpg`));
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        spec?: TemplateSpec;
        mock?: boolean;
        fromLink?: { author: string; cover: boolean } | null;
        error?: string;
      };
      if (!res.ok || !data.spec) {
        setError(ERRORS[data.error ?? "generic"] ?? ERRORS.generic);
        return;
      }
      saveToLibrary(data.spec);
      selectSpec(data.spec);
      setMock(Boolean(data.mock));
      const source = data.fromLink?.author ? ` from @${data.fromLink.author}` : "";
      setNotice(`Copied “${data.spec.name}”${source}. Saved to your library. Now type a topic and write it.`);
      shots.forEach((s) => URL.revokeObjectURL(s.url));
      setShots([]);
      setLink("");
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy(null);
    }
  }

  const linkList = postLinks.split(/\s+/).filter(Boolean);
  const canCopyCreator = platform === "instagram" ? Boolean(handle.trim()) : linkList.length > 0 || shots.length > 0;

  async function copyCreator() {
    if (!canCopyCreator || busy) return;
    setBusy("creator");
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.append("platform", platform);
      form.append("handle", handle.trim());
      if (platform === "tiktok") linkList.slice(0, 10).forEach((l) => form.append("link", l));
      shots.forEach((s, i) => form.append("screenshot", s.blob, `shot-${i}.jpg`));
      const res = await fetch("/api/creator", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { spec?: TemplateSpec; mock?: boolean; error?: string };
      if (!res.ok || !data.spec) {
        setError(ERRORS[data.error ?? "generic"] ?? ERRORS.generic);
        return;
      }
      saveToLibrary(data.spec);
      selectSpec(data.spec);
      setMock(Boolean(data.mock));
      setNotice(`Read @${data.spec.creator?.username ?? "creator"}'s slideshows and saved their format. Now type your topic and write it.`);
      shots.forEach((s) => URL.revokeObjectURL(s.url));
      setShots([]);
      setPostLinks("");
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy(null);
    }
  }

  async function write() {
    if (busy) return;
    if (!topic.trim()) {
      setError(ERRORS.bad_request);
      return;
    }
    setBusy("write");
    setError(null);
    setNotice(null);
    try {
      const { ok, data } = await postJson<{ slides?: string[]; caption?: string; hashtags?: string[]; mock?: boolean }>(
        "/api/write",
        {
          name: spec.name,
          formula: spec.creator?.hooks.length
            ? `${spec.formula}\nHook patterns this creator uses (pick or adapt one): ${spec.creator.hooks.join(" | ")}`
            : spec.formula,
          exampleSlides: spec.exampleSlides,
          topic,
          promote,
          slideCount: spec.slideCount,
        },
      );
      if (!ok || !data.slides) {
        setError(ERRORS[data.error ?? "generic"] ?? ERRORS.generic);
        return;
      }
      const tags = (data.hashtags ?? []).map((h) => `#${h}`).join(" ");
      setDraft((d) => ({ ...d, slides: data.slides!, caption: [data.caption, tags].filter(Boolean).join("\n\n") }));
      setCurrent(0);
      setMock(Boolean(data.mock));
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy(null);
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
    if (added.length && spec.style.background !== "photo") updateStyle("background", "photo");
  }

  function removeBackground(i: number) {
    setBackgrounds((prev) => {
      URL.revokeObjectURL(prev[i].url);
      prev[i].bitmap.close();
      return prev.filter((_, j) => j !== i);
    });
  }

  async function exportZip() {
    setBusy("export");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = SLIDE_W;
      canvas.height = SLIDE_H;
      const ctx = canvas.getContext("2d")!;
      const files: Record<string, Uint8Array> = {};
      for (let i = 0; i < slides.length; i++) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        draw(ctx, i);
        const blob = await canvasToBlob(canvas, "image/png");
        files[`slide-${String(i + 1).padStart(2, "0")}.png`] = new Uint8Array(await blob.arrayBuffer());
      }
      if (draft.caption) files["caption.txt"] = strToU8(draft.caption);
      const zip = zipSync(files, { level: 0 });
      const slug = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "slides";
      download(new Blob([zip.slice().buffer], { type: "application/zip" }), `${slug}.zip`);
    } finally {
      setBusy(null);
    }
  }

  // Demo posting: see src/lib/posting.ts for the official TikTok draft route.
  async function sendToDrafts() {
    setBusy("export");
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = SLIDE_W;
      canvas.height = SLIDE_H;
      const ctx = canvas.getContext("2d")!;
      const form = new FormData();
      for (let i = 0; i < slides.length; i++) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        draw(ctx, i);
        form.append("slide", await canvasToBlob(canvas, "image/jpeg", 0.92), `slide-${i + 1}.jpg`);
      }
      form.append("caption", draft.caption);
      const res = await fetch("/api/post", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) setNotice(data.message ?? "Sent.");
      else setError(ERRORS.generic);
    } finally {
      setBusy(null);
    }
  }

  const formats = [...library, ...CURATED_SPECS];
  const insights = spec.creator;
  const insightLists = insights
    ? [
        { title: "Hooks they use", items: insights.hooks },
        { title: "Why the top posts win", items: insights.whatWorks },
        { title: "Topics", items: insights.topics },
      ]
    : [];

  const shotPicker = (
    <>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {shots.map((s, i) => (
          <button
            key={s.url}
            onClick={() => setShots((prev) => prev.filter((_, j) => j !== i))}
            title="Remove"
            className="relative aspect-[9/16] overflow-hidden rounded-md border border-line"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        {shots.length < LIMITS.maxSlides && (
          <button
            onClick={() => shotInput.current?.click()}
            className="flex aspect-[9/16] items-center justify-center rounded-md border-2 border-dashed border-line text-2xl text-muted hover:border-accent"
            aria-label="Add screenshots"
          >
            +
          </button>
        )}
      </div>
      <input
        ref={shotInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid="shot-input"
        onChange={(e) => {
          void addShots(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <span className="text-xl font-extrabold tracking-tight">{BRAND}</span>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">studio</span>
          <span className="ml-auto hidden truncate text-sm text-muted sm:block">
            Format: <b className="text-ink">{spec.name}</b>
          </span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[360px_1fr_300px]">
        {/* 1. Format + content */}
        <section className="space-y-5">
          <div className="rounded-2xl border border-line bg-card p-4">
            <div className="mb-3 flex gap-1 rounded-xl bg-paper p-1">
              {(["copy", "creator", "library"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === t ? "bg-card shadow-sm" : "text-muted"}`}
                >
                  {t === "copy" ? "📸 Slideshow" : t === "creator" ? "👤 Creator" : `📚 Formats (${formats.length})`}
                </button>
              ))}
            </div>

            {tab === "copy" ? (
              <div>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">TikTok link</span>
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    inputMode="url"
                    placeholder="https://www.tiktok.com/@user/photo/…"
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm"
                  />
                </label>
                <p className="mt-2 text-xs text-muted">
                  A link gives the cover (usually the hook) and the caption. TikTok doesn&apos;t share the other slides,
                  so add screenshots of a middle slide and the last one (the call to action) for a full copy.
                </p>
                <p className="mt-3 text-sm font-semibold">Screenshots</p>
                {shotPicker}
                <button
                  onClick={() => void copyFormat()}
                  disabled={(shots.length === 0 && !link.trim()) || busy !== null}
                  className="mt-3 w-full rounded-xl bg-ink py-3 font-semibold text-white disabled:opacity-40"
                >
                  {busy === "copy" ? "Reading the slideshow…" : "Copy this format"}
                </button>
              </div>
            ) : tab === "creator" ? (
              <div>
                <div className="mb-3 flex gap-2">
                  {(["instagram", "tiktok"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPlatform(p);
                        // "@name" carries over; a link to the other platform doesn't.
                        setHandle((h) => (h.includes("/") ? "" : h));
                      }}
                      aria-pressed={platform === p}
                      className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold ${platform === p ? "border-ink bg-ink text-white" : "border-line text-muted"}`}
                    >
                      {p === "instagram" ? "Instagram" : "TikTok"}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">
                    Username {platform === "tiktok" && <span className="font-normal text-muted">(optional)</span>}
                  </span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder={platform === "instagram" ? "@creator or instagram.com/creator" : "@creator"}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm"
                  />
                </label>
                {platform === "instagram" ? (
                  <p className="mt-2 text-xs text-muted">
                    Reads their last 50 posts through Instagram&apos;s official API, picks the carousels with the most likes and
                    comments, and copies the format they share. Works for business and creator accounts (most big creators).
                  </p>
                ) : (
                  <>
                    <label className="mt-3 block">
                      <span className="mb-1 block text-sm font-semibold">Links to their best slideshows</span>
                      <textarea
                        value={postLinks}
                        onChange={(e) => setPostLinks(e.target.value)}
                        rows={3}
                        placeholder={"One per line, 3–10 links\nhttps://www.tiktok.com/@creator/photo/…"}
                        className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
                      />
                    </label>
                    <p className="mt-1 text-xs text-muted">
                      TikTok doesn&apos;t let apps list someone&apos;s posts, so pick them yourself: sort their profile by
                      Popular and copy the top slideshows&apos; links. A screenshot of their profile grid adds the view counts.
                    </p>
                  </>
                )}
                <p className="mt-3 text-sm font-semibold">
                  Screenshots <span className="font-normal text-muted">(optional: profile grid, or slides)</span>
                </p>
                {shotPicker}
                <button
                  onClick={() => void copyCreator()}
                  disabled={!canCopyCreator || busy !== null}
                  className="mt-3 w-full rounded-xl bg-ink py-3 font-semibold text-white disabled:opacity-40"
                >
                  {busy === "creator" ? "Reading their slideshows… (up to a minute)" : "Copy their format"}
                </button>
              </div>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {formats.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <button
                      onClick={() => selectSpec(f)}
                      className={`flex-1 rounded-lg px-3 py-2 text-left text-sm ${f.id === spec.id ? "bg-accent-soft font-semibold text-accent" : "hover:bg-paper"}`}
                    >
                      {f.creator ? "👤 " : f.source === "copied" ? "📸 " : ""}
                      {f.name}
                    </button>
                    {f.source === "copied" && (
                      <button onClick={() => deleteFromLibrary(f.id)} aria-label={`Delete ${f.name}`} className="px-1 text-muted hover:text-ink">
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-line bg-card p-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Topic</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={LIMITS.maxTopicChars}
                placeholder="e.g. dog owners before Christmas"
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5"
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
                placeholder="e.g. Merry Paws: turns your dog into a royal portrait"
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5"
              />
            </label>
            <button
              onClick={() => void write()}
              disabled={busy !== null}
              className="w-full rounded-xl bg-accent py-3 font-semibold text-accent-ink disabled:opacity-50"
            >
              {busy === "write" ? "Writing…" : "✨ Write the slides"}
            </button>
          </div>

          {insights && (
            <div className="space-y-3 rounded-2xl border border-line bg-card p-4 text-sm" data-testid="creator-insights">
              <p className="font-semibold">
                What works for @{insights.username}{" "}
                <span className="font-normal text-muted">
                  ({insights.platform === "instagram" ? "Instagram" : "TikTok"},{" "}
                  {insights.postsRead > 0 ? `${insights.postsRead} posts read` : "from your screenshots"})
                </span>
              </p>
              <p className="text-muted">{insights.summary}</p>
              {insightLists.map(({ title, items }) =>
                items.length > 0 ? (
                  <div key={title}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
                    <ul className="list-disc space-y-0.5 pl-5">
                      {items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
              <p className="text-xs text-muted">{insights.cadence}</p>
            </div>
          )}
          {notice && <p className="rounded-xl bg-accent-soft p-3 text-sm text-accent">{notice}</p>}
          {error && (
            <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
              {error}
            </p>
          )}
          {mock && <p className="text-xs text-warn">Demo mode: ANTHROPIC_API_KEY isn&apos;t set, so this is example output.</p>}
        </section>

        {/* 2. Big preview */}
        <section className="flex min-w-0 flex-col items-center">
          <div className="relative w-full max-w-[360px] overflow-hidden rounded-[2rem] border-8 border-ink bg-ink shadow-xl">
            <canvas ref={bigCanvas} width={SLIDE_W / 2} height={SLIDE_H / 2} className="block aspect-[9/16] w-full" aria-label={`Slide ${index + 1} preview`} />
            <div className="absolute inset-x-0 top-2 flex justify-center gap-1">
              {slides.map((_, i) => (
                <span key={i} className={`h-1 w-5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
            {index > 0 && (
              <button
                onClick={() => setCurrent(index - 1)}
                aria-label="Previous slide"
                className="absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-black/40 text-white"
              >
                ‹
              </button>
            )}
            {index < slides.length - 1 && (
              <button
                onClick={() => setCurrent(index + 1)}
                aria-label="Next slide"
                className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-black/40 text-white"
              >
                ›
              </button>
            )}
          </div>

          <textarea
            value={slides[index] ?? ""}
            onChange={(e) => setSlideText(index, e.target.value)}
            rows={3}
            aria-label={`Slide ${index + 1} text`}
            className="mt-4 w-full max-w-[360px] rounded-xl border border-line bg-card px-3 py-2 text-sm"
          />

          <div className="mt-3 flex w-full max-w-[520px] gap-2 overflow-x-auto pb-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-14 shrink-0 overflow-hidden rounded-md border-2 ${i === index ? "border-accent" : "border-transparent"}`}
                aria-label={`Go to slide ${i + 1}`}
              >
                {thumbs[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[i]} alt="" className="aspect-[9/16] w-full" />
                ) : (
                  <div className="aspect-[9/16] w-full bg-line" />
                )}
              </button>
            ))}
            <div className="flex shrink-0 flex-col justify-center gap-1 pl-1">
              <button
                onClick={() => {
                  setDraft((d) => ({ ...d, slides: [...d.slides, "New slide"].slice(0, LIMITS.maxSlides) }));
                  setCurrent(slides.length);
                }}
                disabled={slides.length >= LIMITS.maxSlides}
                className="rounded-md border border-line bg-card px-2 py-1 text-xs disabled:opacity-40"
              >
                + slide
              </button>
              <button
                onClick={() => {
                  setDraft((d) => ({ ...d, slides: d.slides.filter((_, j) => j !== index) }));
                  setCurrent(Math.max(0, index - 1));
                }}
                disabled={slides.length <= 1}
                className="rounded-md border border-line bg-card px-2 py-1 text-xs disabled:opacity-40"
              >
                − slide
              </button>
            </div>
          </div>
        </section>

        {/* 3. Look, photos, export */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="mb-2 text-sm font-semibold">Background photos</p>
            <div className="flex flex-wrap gap-2">
              {backgrounds.map((b, i) => (
                <button key={b.url} onClick={() => removeBackground(i)} title="Remove" className="h-16 w-10 overflow-hidden rounded-md border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              <button
                onClick={() => bgInput.current?.click()}
                className="flex h-16 w-10 items-center justify-center rounded-md border border-dashed border-line text-lg text-muted"
                aria-label="Add background photos"
              >
                +
              </button>
            </div>
            <input
              ref={bgInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              data-testid="bg-input"
              onChange={(e) => {
                void addBackgrounds(e.target.files);
                e.target.value = "";
              }}
            />
            <p className="mt-2 text-xs text-muted">Used in order, repeating. Only your own photos or ones you have rights to.</p>
          </div>

          <div className="rounded-2xl border border-line bg-card p-4">
            <button onClick={() => setShowLook((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold">
              Adjust the look <span>{showLook ? "−" : "+"}</span>
            </button>
            {showLook && (
              <div className="mt-3 space-y-3">
                {STYLE_OPTIONS.map((opt) => (
                  <label key={opt.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted">{opt.label}</span>
                    <select
                      value={String(spec.style[opt.key])}
                      onChange={(e) => updateStyle(opt.key, e.target.value)}
                      className="rounded-lg border border-line bg-paper px-2 py-1"
                    >
                      {opt.values.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                ))}
                {(["textColor", "boxColor", "backgroundColor"] as const).map((key) => (
                  <label key={key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted">{key === "textColor" ? "Text colour" : key === "boxColor" ? "Box / outline" : "Background"}</span>
                    <input type="color" value={spec.style[key]} onChange={(e) => updateStyle(key, e.target.value)} />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-2xl border border-line bg-card p-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Caption</span>
              <textarea
                value={draft.caption}
                onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              />
            </label>
            <button
              onClick={() => void exportZip()}
              disabled={busy !== null || !fonts}
              className="w-full rounded-xl bg-ink py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy === "export" ? "Exporting…" : "Download slides (.zip)"}
            </button>
            <button
              onClick={() => void sendToDrafts()}
              disabled={busy !== null || !fonts}
              className="w-full rounded-xl border border-ink/15 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              Send to TikTok drafts (demo)
            </button>
            <button
              onClick={() => void navigator.clipboard.writeText(draft.caption)}
              disabled={!draft.caption}
              className="w-full rounded-xl border border-ink/15 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              Copy caption
            </button>
            <p className="text-xs text-muted">Post as a TikTok photo post and add a trending sound: the sound is half the reach.</p>
          </div>

          <details className="rounded-2xl border border-line bg-card p-4 text-sm">
            <summary className="cursor-pointer font-semibold">How this format works</summary>
            <p className="mt-2 whitespace-pre-line text-muted">{spec.formula}</p>
          </details>
        </section>
      </main>
    </div>
  );
}
