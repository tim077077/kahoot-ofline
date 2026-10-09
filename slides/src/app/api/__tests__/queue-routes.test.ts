import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { slideSignature } from "@/lib/tiktok-official";
import { MemoryStore } from "@/lib/store";
import { proxy } from "@/proxy";
import { POST as extResult } from "../extension/result/route";
import { GET as extQueue } from "../extension/queue/route";
import { POST as insights } from "../insights/route";
import { PATCH as patchPost } from "../posts/[id]/route";
import { GET as getSlide } from "../posts/[id]/slides/[n]/route";
import { GET as listPosts, POST as createPost } from "../posts/route";
import { GET as status } from "../status/route";
import { POST as finder } from "../finder/route";
import { POST as swipe } from "../swipe/route";

let dir: string;
let store: MemoryStore;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "sd-"));
  process.env.SLIDEDROP_DATA_DIR = dir;
  store = new MemoryStore();
  (globalThis as unknown as { __appStore: MemoryStore }).__appStore = store;
  delete process.env.ANTHROPIC_API_KEY;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const H = { "x-slidedrop": "1" };
const json = (url: string, method: string, body: unknown, headers: Record<string, string> = H) =>
  new Request(`http://localhost${url}`, { method, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const ctx = <T extends object>(params: T) => ({ params: Promise.resolve(params) }) as never;

async function queuePost(headers: Record<string, string> = H) {
  const form = new FormData();
  form.append("slide", new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "1.jpg");
  form.append("slide", new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "2.jpg");
  form.append("title", "3 apps that feel illegal");
  form.append("caption", "#apps");
  form.append("format", "Feels illegal");
  form.append("slideTexts", JSON.stringify(["3 apps that feel illegal", "one", "two"]));
  return createPost(new Request("http://localhost/api/posts", { method: "POST", headers, body: form }));
}

describe("post queue routes", () => {
  it("refuses changes from other sites (no x-slidedrop header)", async () => {
    expect((await queuePost({})).status).toBe(403);
    expect((await extResult(json("/api/extension/result", "POST", { id: "p_x", state: "posted" }, {}))).status).toBe(403);
  });

  it("queues a post and lists it", async () => {
    const res = await queuePost();
    const { post } = (await res.json()) as { post: { id: string; status: string; slideCount: number } };
    expect(res.status).toBe(200);
    expect(post).toMatchObject({ status: "ready", slideCount: 2 });
    const { posts } = (await (await listPosts()).json()) as { posts: unknown[] };
    expect(posts).toHaveLength(1);
  });

  it("hands a post to the extension exactly once, then records the result", async () => {
    const { post } = (await (await queuePost()).json()) as { post: { id: string } };
    await patchPost(json(`/api/posts/${post.id}`, "PATCH", { action: "extension" }), ctx({ id: post.id }));

    const q = (await (await extQueue(new Request("http://localhost/api/extension/queue", { headers: H }))).json()) as { posts: { id: string }[] };
    expect(q.posts.map((p) => p.id)).toEqual([post.id]);
    expect(await store.get("extension:lastSeen")).toBeTruthy();

    expect((await extResult(json("/api/extension/result", "POST", { id: post.id, state: "sending" }))).status).toBe(200);
    expect((await extResult(json("/api/extension/result", "POST", { id: post.id, state: "sending" }))).status).toBe(409);
    const done = (await (await extResult(json("/api/extension/result", "POST", { id: post.id, state: "posted", itemId: "7412345678901234567" }))).json()) as {
      post: { status: string; tiktokId: string };
    };
    expect(done.post).toMatchObject({ status: "posted", tiktokId: "7412345678901234567" });
  });

  it("marks a post posted by hand and saves its numbers", async () => {
    const { post } = (await (await queuePost()).json()) as { post: { id: string } };
    const marked = (await (await patchPost(json(`/api/posts/${post.id}`, "PATCH", { action: "posted", link: "https://www.tiktok.com/@me/photo/1" }), ctx({ id: post.id }))).json()) as {
      post: { status: string; channel: string; link: string };
    };
    expect(marked.post).toMatchObject({ status: "posted", channel: "manual", link: "https://www.tiktok.com/@me/photo/1" });
    const withStats = (await (await patchPost(json(`/api/posts/${post.id}`, "PATCH", { action: "stats", stats: { views: 900 } }), ctx({ id: post.id }))).json()) as {
      post: { stats: { views: number } };
    };
    expect(withStats.post.stats.views).toBe(900);
  });

  it("says plainly when drafts aren't set up", async () => {
    const { post } = (await (await queuePost()).json()) as { post: { id: string } };
    const res = (await (await patchPost(json(`/api/posts/${post.id}`, "PATCH", { action: "drafts" }), ctx({ id: post.id }))).json()) as {
      post: { status: string; error: string };
    };
    expect(res.post.status).toBe("failed");
    expect(res.post.error).toMatch(/SLIDEDROP_PUBLIC_URL|Connect/);
  });

  it("serves slides locally, but only signed ones to the outside", async () => {
    const { post } = (await (await queuePost()).json()) as { post: { id: string } };
    const local = await getSlide(new Request(`http://localhost/api/posts/${post.id}/slides/1`, { headers: { host: "localhost:3000" } }), ctx({ id: post.id, n: "1" }));
    expect(local.status).toBe(200);
    expect(local.headers.get("content-type")).toBe("image/jpeg");

    const outside = { host: "slides.example.com", "cf-connecting-ip": "1.2.3.4" };
    const unsigned = await getSlide(new Request(`https://slides.example.com/api/posts/${post.id}/slides/1`, { headers: outside }), ctx({ id: post.id, n: "1" }));
    expect(unsigned.status).toBe(404);
    const sig = await slideSignature(store, post.id, 1);
    const signed = await getSlide(new Request(`https://slides.example.com/api/posts/${post.id}/slides/1?sig=${sig}`, { headers: outside }), ctx({ id: post.id, n: "1" }));
    expect(signed.status).toBe(200);
  });

  it("needs 3 measured posts before analysing", async () => {
    expect((await insights(json("/api/insights", "POST", {}))).status).toBe(400);
  });
});

describe("proxy", () => {
  const req = (url: string, headers: Record<string, string>) => new NextRequest(url, { headers });
  it("lets this computer in everywhere", () => {
    expect(proxy(req("http://localhost:3000/api/posts", { host: "localhost:3000" })).status).toBe(200);
  });
  it("lets the outside reach only slides and the TikTok callback", () => {
    const outside = { host: "slides.example.com" };
    expect(proxy(req("https://slides.example.com/", outside)).status).toBe(404);
    expect(proxy(req("https://slides.example.com/api/write", outside)).status).toBe(404);
    expect(proxy(req("https://slides.example.com/api/posts/p_abc123/slides/1", outside)).status).toBe(200);
    expect(proxy(req("https://slides.example.com/api/tiktok/callback", outside)).status).toBe(200);
    // A tunnel that rewrites the host is still caught.
    expect(proxy(req("http://localhost:3000/studio", { host: "localhost:3000", "cf-connecting-ip": "1.2.3.4" })).status).toBe(404);
  });
});

describe("status, finder, swipe", () => {
  it("reports every check with a state", async () => {
    const data = (await (await status()).json()) as { checks: { id: string; state: string }[] };
    expect(data.checks.map((c) => c.id)).toEqual(["storage", "claude", "instagram", "finder", "drafts", "extension"]);
    expect(data.checks.find((c) => c.id === "claude")?.state).toBe("off");
    expect(data.checks.find((c) => c.id === "storage")?.state).toBe("ok");
  });

  it("validates hashtags and explains a missing Instagram setup", async () => {
    expect((await finder(json("/api/finder", "POST", { hashtag: "a b c!" }))).status).toBe(400);
    const res = await finder(json("/api/finder", "POST", { hashtag: "#studytok" }));
    expect(await res.json()).toEqual({ error: "instagram_not_configured" });
  });

  it("only saves TikTok links to the swipe file", async () => {
    expect((await swipe(json("/api/swipe", "POST", { link: "https://evil.com/x" }))).status).toBe(400);
  });
});
