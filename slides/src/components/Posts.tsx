"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { appJson, errorText } from "@/lib/client";
import type { Group, PerformanceReport } from "@/lib/performance";
import type { PostStats, QueuedPost } from "@/lib/queue";
import { Nav } from "./Nav";

// My posts: type in each post's numbers (TikTok app → the post → analytics,
// about 48 hours after posting), see the free comparisons, and ask Claude
// what's separating your winners from your losers.

type Numbers = { measured: number; medianViews: number; byFormat: Group[]; byChannel: Group[] };
const FIELDS = ["views", "likes", "comments", "shares", "saves"] as const;
const CHANNEL_NAMES: Record<string, string> = { drafts: "Official drafts (app sound)", extension: "Extension (web sound)", manual: "By hand" };

function StatsRow({ post, onSaved }: { post: QueuedPost; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f, post.stats ? String(post.stats[f]) : ""])),
  );
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setState("saving");
    const stats = Object.fromEntries(FIELDS.map((f) => [f, Number(values[f] || 0)])) as Omit<PostStats, "at">;
    const { ok } = await appJson(`/api/posts/${post.id}`, "PATCH", { action: "stats", stats });
    setState(ok ? "saved" : "error");
    if (ok) onSaved();
  }

  return (
    <tr className="border-t border-line align-top">
      <td className="py-2 pr-3">
        <p className="line-clamp-2 max-w-xs font-semibold">{post.title}</p>
        <p className="text-xs text-muted">
          {post.format || "custom"} · {CHANNEL_NAMES[post.channel ?? "manual"]} · {post.postedAt ? new Date(post.postedAt).toLocaleDateString() : ""}
          {post.link && (
            <>
              {" · "}
              <a href={post.link} target="_blank" rel="noreferrer" className="text-accent">
                open
              </a>
            </>
          )}
        </p>
      </td>
      {FIELDS.map((f) => (
        <td key={f} className="py-2 pr-2">
          <input
            value={values[f]}
            onChange={(e) => {
              setValues((v) => ({ ...v, [f]: e.target.value.replace(/[^\d]/g, "") }));
              setState("idle");
            }}
            inputMode="numeric"
            aria-label={`${f} for ${post.title}`}
            className="w-20 rounded-md border border-line bg-paper px-2 py-1"
          />
        </td>
      ))}
      <td className="py-2">
        <button onClick={() => void save()} disabled={state === "saving"} className="rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
          {state === "saved" ? "✓ Saved" : state === "error" ? "Retry" : "Save"}
        </button>
      </td>
    </tr>
  );
}

function GroupTable({ title, groups, names }: { title: string; groups: Group[]; names?: Record<string, string> }) {
  if (groups.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul className="space-y-1 text-sm">
        {groups.map((g) => (
          <li key={g.key} className="flex gap-2">
            <span className="min-w-0 flex-1 truncate">{names?.[g.key] ?? g.key}</span>
            <span className="text-muted">
              {g.avgViews.toLocaleString()} avg views · {g.engagement}% eng. · {g.posts} post{g.posts === 1 ? "" : "s"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Posts() {
  const [posts, setPosts] = useState<QueuedPost[]>([]);
  const [numbers, setNumbers] = useState<Numbers | null>(null);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [minPosts, setMinPosts] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, i] = await Promise.all([
      appJson<{ posts: QueuedPost[] }>("/api/posts"),
      appJson<{ numbers: Numbers; report: PerformanceReport | null; minPosts: number }>("/api/insights"),
    ]);
    if (p.ok) setPosts(p.data.posts.filter((x) => x.status === "posted"));
    if (i.ok) {
      setNumbers(i.data.numbers);
      setReport(i.data.report);
      setMinPosts(i.data.minPosts);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function analyse() {
    setBusy(true);
    setError(null);
    const { ok, data } = await appJson<{ numbers: Numbers; report: PerformanceReport }>("/api/insights", "POST");
    if (ok) {
      setNumbers(data.numbers);
      setReport(data.report);
    } else setError(errorText(data.error));
    setBusy(false);
  }

  const titleOf = (id: string) => posts.find((p) => p.id === id)?.title ?? id;
  const enough = (numbers?.measured ?? 0) >= minPosts;

  return (
    <div className="flex min-h-screen flex-col">
      <Nav current="posts" />
      <main className="mx-auto grid w-full grid-cols-1 max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <section className="min-w-0 rounded-2xl border border-line bg-card p-4">
          <h2 className="text-lg font-bold">Posted slideshows</h2>
          <p className="mt-1 text-sm text-muted">
            About 48 hours after posting, open the post in the TikTok app → analytics, and copy the numbers here. TikTok doesn&apos;t give apps your
            photo-post stats, so this part is by hand. Two minutes a week.
          </p>
          {posts.length === 0 ? (
            <p className="mt-4 rounded-xl bg-paper p-4 text-sm text-muted">
              Nothing posted yet. Posts show up here once they&apos;re marked posted on the <Link href="/" className="font-semibold text-accent">Dashboard</Link>.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="pb-1 font-semibold">Post</th>
                    {FIELDS.map((f) => (
                      <th key={f} className="pb-1 font-semibold">
                        {f}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <StatsRow key={p.id} post={p} onSaved={() => void load()} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="min-w-0 space-y-6">
          <section className="space-y-4 rounded-2xl border border-line bg-card p-4">
            <h2 className="text-lg font-bold">What&apos;s working for you</h2>
            {!numbers || numbers.measured === 0 ? (
              <p className="text-sm text-muted">Add views for a few posts and the comparisons appear here.</p>
            ) : (
              <>
                <p className="text-sm">
                  {numbers.measured} posts measured · median <b>{numbers.medianViews.toLocaleString()}</b> views
                </p>
                <GroupTable title="By format" groups={numbers.byFormat} />
                <GroupTable title="By how it was posted" groups={numbers.byChannel} names={CHANNEL_NAMES} />
              </>
            )}
            <button
              onClick={() => void analyse()}
              disabled={!enough || busy}
              className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-40"
            >
              {busy ? "Reading your posts…" : enough ? "✨ Analyse my posts" : `Needs ${minPosts}+ posts with views`}
            </button>
            {error && (
              <p role="alert" className="text-sm text-bad">
                {error}
              </p>
            )}
          </section>

          {report && (
            <section className="space-y-3 rounded-2xl border border-line bg-card p-4 text-sm" data-testid="report">
              <p className="text-xs text-muted">
                Report from {new Date(report.at).toLocaleString()} · {report.measured} posts{report.mock ? " · demo output" : ""}
              </p>
              <p>{report.summary}</p>
              {[
                { title: "Winners", items: report.winners.map((w) => `${titleOf(w.postId)}: ${w.why}`) },
                { title: "Losers", items: report.losers.map((w) => `${titleOf(w.postId)}: ${w.why}`) },
                { title: "Do more", items: report.doMore },
                { title: "Stop doing", items: report.stopDoing },
                { title: "Hooks to test next", items: report.nextHooks },
              ].map((block) =>
                block.items.length ? (
                  <div key={block.title}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{block.title}</p>
                    <ul className="list-disc space-y-0.5 pl-5">
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
              <p className="text-xs text-muted">{report.confidence}</p>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}
