"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addToLibrary, appFetch, appJson, errorText } from "@/lib/client";
import type { InstagramPost } from "@/lib/instagram";
import type { TemplateSpec } from "@/lib/spec";
import type { SwipeItem } from "@/lib/swipe";
import { Nav } from "./Nav";

// Find viral slideshows to copy: Instagram's top carousels for a hashtag
// (official API), and a TikTok swipe file (TikTok has no official search, so
// you paste the links you find).

type Copied = { spec: TemplateSpec; mock: boolean };

async function analyze(form: FormData): Promise<{ ok: true; result: Copied } | { ok: false; error: string }> {
  const res = await appFetch("/api/analyze", { method: "POST", body: form }).catch(() => null);
  const data = ((await res?.json().catch(() => null)) ?? {}) as { spec?: TemplateSpec; mock?: boolean; error?: string };
  if (!res?.ok || !data.spec) return { ok: false, error: errorText(data.error) };
  return { ok: true, result: { spec: data.spec, mock: Boolean(data.mock) } };
}

function CopiedNote({ copied }: { copied: Copied }) {
  return (
    <p className="rounded-xl bg-ok-soft p-3 text-sm text-ok" role="status">
      Copied &ldquo;{copied.spec.name}&rdquo; to your formats{copied.mock ? " (demo output: no API key)" : ""}.{" "}
      <Link href={`/studio?spec=${encodeURIComponent(copied.spec.id)}`} className="font-semibold underline">
        Open in Studio →
      </Link>
    </p>
  );
}

export function Finder() {
  const [tag, setTag] = useState("");
  const [igPosts, setIgPosts] = useState<InstagramPost[] | null>(null);
  const [igTag, setIgTag] = useState("");
  const [cached, setCached] = useState(false);
  const [swipe, setSwipe] = useState<SwipeItem[]>([]);
  const [link, setLink] = useState("");
  const [niche, setNiche] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<Copied | null>(null);
  const [trend, setTrend] = useState<TemplateSpec | null>(null);

  useEffect(() => {
    void (async () => {
      const { ok, data } = await appJson<{ items: SwipeItem[] }>("/api/swipe");
      if (ok) setSwipe(data.items);
    })();
  }, []);

  function start(what: string) {
    setBusy(what);
    setError(null);
    setCopied(null);
  }

  async function search(fresh = false) {
    if (!tag.trim() || busy) return;
    start("search");
    setTrend(null);
    const { ok, data } = await appJson<{ hashtag: string; posts: InstagramPost[]; cached: boolean }>("/api/finder", "POST", { hashtag: tag, fresh });
    if (ok) {
      setIgPosts(data.posts);
      setIgTag(data.hashtag);
      setCached(data.cached);
    } else setError(errorText(data.error));
    setBusy(null);
  }

  async function analyzeTrend() {
    start("trend");
    const { ok, data } = await appJson<{ spec: TemplateSpec; mock: boolean }>("/api/finder", "POST", { hashtag: igTag, action: "trend" });
    if (ok && data.spec) {
      addToLibrary(data.spec);
      setTrend(data.spec);
      setCopied({ spec: data.spec, mock: data.mock });
    } else setError(errorText(data.error));
    setBusy(null);
  }

  async function copyInstagram(post: InstagramPost) {
    start(post.permalink);
    const form = new FormData();
    post.images.slice(0, 10).forEach((u) => form.append("imageUrl", u));
    form.append("caption", post.caption);
    const r = await analyze(form);
    if (r.ok) {
      addToLibrary(r.result.spec);
      setCopied(r.result);
    } else setError(r.error);
    setBusy(null);
  }

  async function addLink() {
    if (!link.trim() || busy) return;
    start("add");
    const { ok, data } = await appJson<{ item: SwipeItem }>("/api/swipe", "POST", { link });
    if (ok && data.item) {
      setSwipe((prev) => [data.item, ...prev.filter((i) => i.key !== data.item.key)]);
      setLink("");
    } else setError(errorText(data.error));
    setBusy(null);
  }

  async function copyTikTok(item: SwipeItem) {
    start(item.key);
    const form = new FormData();
    form.append("link", item.link);
    const r = await analyze(form);
    if (r.ok) {
      addToLibrary(r.result.spec);
      setCopied(r.result);
    } else setError(r.error);
    setBusy(null);
  }

  async function removeItem(item: SwipeItem) {
    await appJson(`/api/swipe/${item.key}`, "DELETE");
    setSwipe((prev) => prev.filter((i) => i.key !== item.key));
  }

  const tiktokSearch = `https://www.tiktok.com/search/photo?q=${encodeURIComponent(niche.trim() || "slideshow")}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Nav current="find" />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
            {error}
          </p>
        )}
        {copied && <CopiedNote copied={copied} />}

        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-lg font-bold">Instagram: top carousels for a hashtag</h2>
          <p className="mt-1 text-sm text-muted">
            Instagram&apos;s own &ldquo;top&rdquo; posts for a hashtag, carousels only, ranked by likes + comments. Official API: needs your Instagram
            token. Meta allows 30 different hashtags a week, so results are kept for 6 hours.
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="#studytok"
              autoCapitalize="none"
              className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm"
            />
            <button disabled={!tag.trim() || busy !== null} className="rounded-xl bg-ink px-4 font-semibold text-white disabled:opacity-40">
              {busy === "search" ? "Searching…" : "Search"}
            </button>
          </form>

          {igPosts && (
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">
                  {igPosts.length} top carousels in #{igTag}
                </span>
                {cached && (
                  <button onClick={() => void search(true)} className="text-xs text-accent underline">
                    (saved results, refresh)
                  </button>
                )}
                {igPosts.length > 0 && (
                  <button
                    onClick={() => void analyzeTrend()}
                    disabled={busy !== null}
                    className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-50"
                  >
                    {busy === "trend" ? "Reading the top 4… (up to a minute)" : `✨ What's winning in #${igTag}`}
                  </button>
                )}
              </div>
              {trend?.creator && (
                <div className="mb-4 rounded-xl bg-paper p-3 text-sm">
                  <p className="font-semibold">What&apos;s winning in #{igTag}</p>
                  <p className="text-muted">{trend.creator.summary}</p>
                  <ul className="mt-1 list-disc pl-5">
                    {trend.creator.whatWorks.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {igPosts.map((p) => (
                  <li key={p.permalink || p.images[0]} className="overflow-hidden rounded-xl border border-line">
                    <a href={p.permalink} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.images[0]} alt="" referrerPolicy="no-referrer" className="aspect-[4/5] w-full bg-paper object-cover" />
                    </a>
                    <div className="space-y-1 p-2 text-xs">
                      <p className="text-muted">
                        ♥ {p.likes.toLocaleString()} · 💬 {p.comments.toLocaleString()} · {p.images.length} slides
                      </p>
                      <p className="line-clamp-2">{p.caption}</p>
                      <button
                        onClick={() => void copyInstagram(p)}
                        disabled={busy !== null}
                        className="w-full rounded-lg bg-ink py-1.5 font-semibold text-white disabled:opacity-40"
                      >
                        {busy === p.permalink ? "Copying…" : "Copy format"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-lg font-bold">TikTok: your swipe file</h2>
          <p className="mt-1 text-sm text-muted">
            TikTok has no official way for apps to search other people&apos;s posts, so you do the finding: search your niche, look for photo posts
            with lots of likes, copy the link (Share → Copy link) and paste it here. One click copies the format later.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                window.open(tiktokSearch, "_blank", "noopener");
              }}
            >
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Your niche, e.g. dog tips"
                className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm"
              />
              <button className="rounded-xl border border-line px-4 text-sm font-semibold">Search TikTok ↗</button>
            </form>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void addLink();
              }}
            >
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                inputMode="url"
                placeholder="Paste a TikTok slideshow link"
                className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm"
              />
              <button disabled={!link.trim() || busy !== null} className="rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40">
                {busy === "add" ? "Adding…" : "Save"}
              </button>
            </form>
          </div>

          {swipe.length === 0 ? (
            <p className="mt-4 rounded-xl bg-paper p-4 text-sm text-muted">Nothing saved yet. Save 10 slideshows from your niche, then copy the ones that keep showing up.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="swipe">
              {swipe.map((item) => (
                <li key={item.key} className="overflow-hidden rounded-xl border border-line">
                  <a href={item.link} target="_blank" rel="noreferrer">
                    {item.hasCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/swipe/${item.key}`} alt="" className="aspect-[9/16] w-full bg-paper object-cover" />
                    ) : (
                      <div className="flex aspect-[9/16] items-center justify-center bg-paper text-xs text-muted">no cover</div>
                    )}
                  </a>
                  <div className="space-y-1 p-2 text-xs">
                    <p className="font-semibold">@{item.author || "unknown"}</p>
                    <p className="line-clamp-2 text-muted">{item.caption}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => void copyTikTok(item)}
                        disabled={busy !== null}
                        className="flex-1 rounded-lg bg-ink py-1.5 font-semibold text-white disabled:opacity-40"
                      >
                        {busy === item.key ? "Copying…" : "Copy format"}
                      </button>
                      <button onClick={() => void removeItem(item)} aria-label="Remove" className="rounded-lg border border-line px-2">
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
