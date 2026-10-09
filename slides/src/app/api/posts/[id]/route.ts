import { forbidCrossSite, storeOr503 } from "@/lib/http";
import { refreshDraft, sendPostToDrafts } from "@/lib/posting";
import { deletePost, getPost, parseStats, updatePost } from "@/lib/queue";

type Body = { action?: string; stats?: unknown; link?: unknown };

// One post's actions: send to drafts, hand to the extension, mark it posted
// by hand, put it back in the queue, check a draft, or save its numbers.
export async function PATCH(request: Request, ctx: RouteContext<"/api/posts/[id]">) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  const store = storeOr503();
  if (store instanceof Response) return store;

  const { id } = await ctx.params;
  const post = getPost(id);
  if (!post) return Response.json({ error: "not_found" }, { status: 404 });
  const body = ((await request.json().catch(() => ({}))) ?? {}) as Body;

  switch (body.action) {
    case "drafts":
      return Response.json({ post: await sendPostToDrafts(store, id) });
    case "check":
      return Response.json({ post: await refreshDraft(store, id) });
    case "extension":
      return Response.json({ post: updatePost(id, { status: "ready", channel: "extension" }) });
    case "requeue":
      return Response.json({ post: updatePost(id, { status: "ready", channel: undefined, tiktokId: undefined }) });
    case "posted": {
      const link = typeof body.link === "string" && /^https:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//.test(body.link) ? body.link : post.link;
      return Response.json({ post: updatePost(id, { status: "posted", channel: post.channel ?? "manual", link }) });
    }
    case "stats": {
      const stats = parseStats(body.stats);
      if (!stats) return Response.json({ error: "bad_request" }, { status: 400 });
      return Response.json({ post: updatePost(id, { stats }) });
    }
    default:
      return Response.json({ error: "bad_request" }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/posts/[id]">) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  deletePost((await ctx.params).id);
  return Response.json({ ok: true });
}
