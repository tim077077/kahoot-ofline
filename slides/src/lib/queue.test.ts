import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { summarize } from "./performance";
import { addPost, deletePost, getPost, listPosts, parseStats, readSlide, updatePost } from "./queue";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "sd-"));
  process.env.SLIDEDROP_DATA_DIR = dir;
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.SLIDEDROP_DATA_DIR;
});

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const add = (title = "5 things I wish I knew") => addPost({ title, caption: "#tips", format: "Wish I knew", slideTexts: [title, "one"] }, [jpeg, jpeg]);

describe("queue", () => {
  it("stores a post with its slides and lists newest first", async () => {
    const a = add("first");
    await new Promise((r) => setTimeout(r, 5));
    const b = add("second");
    expect(listPosts().map((p) => p.id)).toEqual([b.id, a.id]);
    expect(readSlide(a.id, 1)).toEqual(Buffer.from(jpeg));
    expect(readSlide(a.id, 3)).toBeNull();
    expect(a.status).toBe("ready");
  });

  it("caps titles at TikTok's 90 characters", () => {
    expect([...add("x".repeat(200)).title]).toHaveLength(90);
  });

  it("stamps postedAt once and clears errors on success", () => {
    const p = add();
    updatePost(p.id, { status: "failed", error: "nope" });
    const posted = updatePost(p.id, { status: "posted" })!;
    expect(posted.error).toBeUndefined();
    expect(posted.postedAt).toBeTruthy();
    expect(updatePost(p.id, { status: "posted" })!.postedAt).toBe(posted.postedAt);
  });

  it("never touches paths outside the data folder", () => {
    expect(getPost("../../etc")).toBeNull();
    expect(readSlide("p_../../x", 1)).toBeNull();
    expect(() => deletePost("../x")).not.toThrow();
  });

  it("cleans up typed-in numbers", () => {
    expect(parseStats({ views: "1200", likes: -5, comments: "abc", shares: 3.6 })).toMatchObject({ views: 1200, likes: 0, comments: 0, shares: 4, saves: 0 });
    expect(parseStats(null)).toBeNull();
  });
});

describe("summarize", () => {
  it("compares formats and posting routes from measured posts only", () => {
    const a = add("a");
    const b = add("b");
    const c = add("c");
    updatePost(a.id, { status: "posted", channel: "drafts", stats: { views: 1000, likes: 100, comments: 0, shares: 0, saves: 0, at: "" } });
    updatePost(b.id, { status: "posted", channel: "extension", stats: { views: 200, likes: 2, comments: 0, shares: 0, saves: 0, at: "" } });
    updatePost(c.id, { status: "ready" });
    const s = summarize(listPosts());
    expect(s.measured).toBe(2);
    expect(s.byChannel.map((g) => g.key)).toEqual(["drafts", "extension"]);
    expect(s.byChannel[0].engagement).toBe(10);
  });
});
