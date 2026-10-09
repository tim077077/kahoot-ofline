import { forbidCrossSite } from "@/lib/http";
import { getPost, updatePost } from "@/lib/queue";

type Body = { id?: unknown; state?: unknown; itemId?: unknown; error?: unknown };

// The extension reports back: "sending" before it starts (so a post can't go
// out twice), then "posted" with TikTok's item id, or "failed" with why.
export async function POST(request: Request) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  const body = ((await request.json().catch(() => ({}))) ?? {}) as Body;
  const id = typeof body.id === "string" ? body.id : "";
  const post = getPost(id);
  if (!post || post.channel !== "extension") return Response.json({ error: "not_found" }, { status: 404 });

  if (body.state === "sending") {
    if (post.status !== "ready") return Response.json({ error: "already_taken" }, { status: 409 });
    return Response.json({ post: updatePost(id, { status: "sending" }) });
  }
  if (body.state === "posted") {
    const itemId = typeof body.itemId === "string" && /^\d{5,30}$/.test(body.itemId) ? body.itemId : undefined;
    return Response.json({ post: updatePost(id, { status: "posted", tiktokId: itemId }) });
  }
  if (body.state === "failed") {
    const error = typeof body.error === "string" ? body.error.slice(0, 300) : "The extension couldn't post it.";
    return Response.json({ post: updatePost(id, { status: "failed", error: `Extension: ${error}` }) });
  }
  return Response.json({ error: "bad_request" }, { status: 400 });
}
