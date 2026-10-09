"use client";

import { strToU8, zipSync } from "fflate";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { download } from "@/lib/browser";
import { appJson, errorText } from "@/lib/client";
import type { Settings } from "@/lib/posting";
import type { QueuedPost } from "@/lib/queue";
import { Nav } from "./Nav";

type Check = { id: string; label: string; state: "ok" | "warn" | "off" | "error"; detail: string; fix?: string };
type Status = { checks: Check[]; queue: Record<string, number>; tiktokAccount: boolean };

const DOT: Record<Check["state"], string> = { ok: "bg-ok", warn: "bg-warn", off: "bg-line", error: "bg-bad" };
const WORD: Record<Check["state"], string> = { ok: "Working", warn: "Check", off: "Not set up", error: "Broken" };

const STATUS_LABEL: Record<QueuedPost["status"], { text: string; tone: string }> = {
  ready: { text: "In queue", tone: "bg-paper text-muted" },
  sending: { text: "Sending…", tone: "bg-accent-soft text-accent" },
  in_drafts: { text: "In your TikTok drafts", tone: "bg-ok-soft text-ok" },
  posted: { text: "Posted", tone: "bg-ok-soft text-ok" },
  failed: { text: "Failed", tone: "bg-bad-soft text-bad" },
};

const BANNERS: Record<string, string> = {
  connected: "✓ TikTok connected. New posts can now go straight to your drafts.",
  denied: "You didn't allow access on TikTok, so nothing changed.",
  bad_state: "That login link expired. Click Connect TikTok again.",
  failed: "TikTok login failed. Check TIKTOK_CLIENT_KEY / SECRET and that the redirect URI in your TikTok app is SLIDEDROP_PUBLIC_URL/api/tiktok/callback.",
  not_configured: "Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and SLIDEDROP_PUBLIC_URL first (README → Official TikTok drafts).",
};

async function downloadPost(post: QueuedPost) {
  const files: Record<string, Uint8Array> = {};
  for (let n = 1; n <= post.slideCount; n++) {
    const res = await fetch(`/api/posts/${post.id}/slides/${n}`);
    files[`slide-${String(n).padStart(2, "0")}.jpg`] = new Uint8Array(await res.arrayBuffer());
  }
  files["caption.txt"] = strToU8(post.caption);
  files["title.txt"] = strToU8(post.title);
  const zip = zipSync(files, { level: 0 });
  download(new Blob([zip.slice().buffer], { type: "application/zip" }), `${post.id}.zip`);
}

export function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(false);
  const [posts, setPosts] = useState<QueuedPost[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    const { ok, data } = await appJson<{ posts: QueuedPost[] }>("/api/posts");
    if (ok) setPosts(data.posts);
  }, []);

  const recheck = useCallback(async () => {
    setChecking(true);
    const { ok, data } = await appJson<Status>("/api/status");
    if (ok) setStatus(data);
    setChecking(false);
  }, []);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("tiktok");
    void (async () => {
      if (result) {
        setBanner(BANNERS[result] ?? null);
        window.history.replaceState(null, "", "/");
      }
      await Promise.all([recheck(), loadPosts()]);
      const { ok, data } = await appJson<{ settings: Settings }>("/api/settings");
      if (ok) setSettings(data.settings);
    })();
  }, [recheck, loadPosts]);

  // While something is on its way, keep the list fresh: drafts are checked
  // with TikTok, extension posts are picked up from the tiktok.com tab.
  useEffect(() => {
    const waiting = posts.filter((p) => p.status === "sending" || (p.channel === "extension" && p.status === "ready"));
    if (waiting.length === 0) return;
    const timer = setInterval(async () => {
      for (const p of waiting.filter((p) => p.channel === "drafts")) await appJson(`/api/posts/${p.id}`, "PATCH", { action: "check" });
      await loadPosts();
    }, 15000);
    return () => clearInterval(timer);
  }, [posts, loadPosts]);

  async function act(post: QueuedPost, action: string, extra: Record<string, unknown> = {}) {
    setBusyId(post.id);
    setError(null);
    const { ok, data } = await appJson<{ post: QueuedPost }>(`/api/posts/${post.id}`, "PATCH", { action, ...extra });
    if (!ok) setError(errorText(data.error));
    await loadPosts();
    setBusyId(null);
  }

  async function remove(post: QueuedPost) {
    if (!window.confirm(`Delete "${post.title}" from SlideDrop? (Doesn't touch TikTok.)`)) return;
    await appJson(`/api/posts/${post.id}`, "DELETE");
    await loadPosts();
  }

  async function markPosted(post: QueuedPost) {
    const link = window.prompt("Posted! Paste the TikTok link (optional, helps you find it later):", "") ?? "";
    await act(post, "posted", { link: link.trim() });
  }

  async function updateSettings(patch: Partial<Settings>) {
    const { ok, data } = await appJson<{ settings: Settings }>("/api/settings", "PUT", patch);
    if (ok) setSettings(data.settings);
  }

  async function disconnect() {
    await appJson("/api/tiktok/disconnect", "POST");
    await recheck();
  }

  const draftsCheck = status?.checks.find((c) => c.id === "drafts");
  const draftsWork = draftsCheck?.state === "ok";
  const open = posts.filter((p) => p.status !== "posted");
  const recent = posts.filter((p) => p.status === "posted").slice(0, 5);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav current="dashboard" />
      <main className="mx-auto grid w-full grid-cols-1 max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {banner && (
            <p className="rounded-xl bg-accent-soft p-3 text-sm text-accent" role="status">
              {banner}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
              {error}
            </p>
          )}

          <section className="rounded-2xl border border-line bg-card p-4">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-lg font-bold">Post queue</h2>
              <span className="text-sm text-muted">{open.length} waiting</span>
              <Link href="/studio" className="ml-auto rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white">
                + Make one
              </Link>
            </div>
            {open.length === 0 ? (
              <p className="rounded-xl bg-paper p-4 text-sm text-muted">
                Nothing in the queue. Make a slideshow in the <Link href="/studio" className="font-semibold text-accent">Studio</Link> and click
                &ldquo;Add to post queue&rdquo;.
              </p>
            ) : (
              <ul className="space-y-3" data-testid="queue">
                {open.map((p) => (
                  <li key={p.id} className="flex gap-3 rounded-xl border border-line p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/posts/${p.id}/slides/1`} alt="" className="h-28 w-[63px] shrink-0 rounded-md bg-paper object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_LABEL[p.status].tone}`}>
                          {p.channel === "extension" && p.status === "ready" ? "Waiting for the extension" : STATUS_LABEL[p.status].text}
                        </span>
                        <span className="text-xs text-muted">
                          {p.slideCount} slides · {p.format || "custom"}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold">{p.title}</p>
                      {p.error && <p className="mt-1 text-xs text-bad">{p.error}</p>}
                      {p.status === "in_drafts" && <p className="mt-1 text-xs text-ok">Open TikTok → inbox → finish it with a trending sound, then mark it posted.</p>}
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                        {(p.status === "ready" || p.status === "failed") && (
                          <>
                            <button
                              onClick={() => void act(p, "drafts")}
                              disabled={!draftsWork || busyId === p.id}
                              title={draftsWork ? "" : "Set up official drafts first (right column)"}
                              className="rounded-lg bg-ink px-2.5 py-1.5 text-white disabled:opacity-40"
                            >
                              📥 Send to TikTok drafts
                            </button>
                            {p.channel !== "extension" && (
                              <button onClick={() => void act(p, "extension")} disabled={busyId === p.id} className="rounded-lg border border-line px-2.5 py-1.5">
                                ⚡ Post via extension
                              </button>
                            )}
                          </>
                        )}
                        <button onClick={() => void downloadPost(p)} className="rounded-lg border border-line px-2.5 py-1.5">
                          ⬇ Download
                        </button>
                        <button onClick={() => void markPosted(p)} className="rounded-lg border border-line px-2.5 py-1.5">
                          ✓ Mark posted
                        </button>
                        {(p.status === "failed" || p.channel) && p.status !== "sending" && (
                          <button onClick={() => void act(p, "requeue")} className="rounded-lg border border-line px-2.5 py-1.5">
                            ↺ Reset
                          </button>
                        )}
                        <button onClick={() => void remove(p)} aria-label={`Delete ${p.title}`} className="rounded-lg px-2 py-1.5 text-muted hover:text-bad">
                          🗑
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-card p-4">
            <div className="mb-3 flex items-center">
              <h2 className="text-lg font-bold">Recently posted</h2>
              <Link href="/posts" className="ml-auto text-sm font-semibold text-accent">
                Add numbers & analyse →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-muted">Nothing posted yet. Your first 5 posts will teach you more than any feature.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate">{p.title}</span>
                    <span className="text-xs text-muted">{p.stats ? `${p.stats.views.toLocaleString()} views` : "no numbers yet"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-line bg-card p-4" data-testid="checks">
            <div className="mb-3 flex items-center">
              <h2 className="text-lg font-bold">What&apos;s working</h2>
              <button onClick={() => void recheck()} disabled={checking} className="ml-auto rounded-lg border border-line px-2.5 py-1 text-xs font-semibold disabled:opacity-50">
                {checking ? "Checking…" : "Re-check"}
              </button>
            </div>
            {!status ? (
              <p className="text-sm text-muted">Checking…</p>
            ) : (
              <ul className="space-y-3">
                {status.checks.map((c) => (
                  <li key={c.id} className="text-sm">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[c.state]}`} aria-hidden />
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {c.label} <span className="font-normal text-muted">· {WORD[c.state]}</span>
                        </p>
                        <p className="text-muted">{c.detail}</p>
                        {c.fix && <p className="text-xs text-ink">→ {c.fix}</p>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-line bg-card p-4 text-sm">
            <h2 className="text-lg font-bold">How posts leave</h2>
            <div>
              <p className="font-semibold">📥 Official TikTok drafts</p>
              <p className="text-muted">Lands in your TikTok inbox; you add a trending sound in the app and post. Safest, and the best sounds.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {status?.tiktokAccount ? (
                  <button onClick={() => void disconnect()} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold">
                    Disconnect TikTok
                  </button>
                ) : (
                  <a href="/api/tiktok/login" className="rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-white">
                    Connect TikTok
                  </a>
                )}
                <label className={`flex items-center gap-2 text-xs ${draftsWork ? "" : "opacity-50"}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(settings?.autoDrafts)}
                    disabled={!settings || !draftsWork}
                    onChange={(e) => void updateSettings({ autoDrafts: e.target.checked })}
                  />
                  Auto-save every new post to drafts
                </label>
              </div>
            </div>
            <div>
              <p className="font-semibold">⚡ Extension</p>
              <p className="text-muted">Posts live from your logged-in tiktok.com tab when you click &ldquo;Post queued&rdquo; there. Against TikTok&apos;s terms: use a spare account. Web-library sounds only.</p>
              {settings && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    Wait
                    <input
                      type="number"
                      min={30}
                      max={600}
                      defaultValue={settings.extensionGap}
                      onBlur={(e) => void updateSettings({ extensionGap: Number(e.target.value) })}
                      className="w-16 rounded-md border border-line bg-paper px-2 py-1"
                    />
                    s between posts
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={settings.extensionSound} onChange={(e) => void updateSettings({ extensionSound: e.target.checked })} />
                    Add a sound
                  </label>
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold">✋ By hand</p>
              <p className="text-muted">Download, post from your phone, then &ldquo;Mark posted&rdquo;. Every route ends up in My posts.</p>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
