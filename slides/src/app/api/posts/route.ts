import { forbidCrossSite, storeOr503 } from "@/lib/http";
import { draftsReady, getSettings, sendPostToDrafts } from "@/lib/posting";
import { addPost, listPosts, MAX_SLIDES } from "@/lib/queue";

const MAX_BYTES = 5 * 1024 * 1024;

export async function GET() {
  return Response.json({ posts: listPosts() });
}

// Add a finished carousel to the queue. With auto-drafts on (and the official
// route set up), it goes straight to your TikTok inbox.
export async function POST(request: Request) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  const store = storeOr503();
  if (store instanceof Response) return store;

  const form = await request.formData().catch(() => null);
  const slides = (form?.getAll("slide") ?? []).filter((s): s is File => s instanceof Blob);
  if (slides.length === 0 || slides.length > MAX_SLIDES) return Response.json({ error: "bad_request" }, { status: 400 });
  if (slides.some((s) => s.type !== "image/jpeg" || s.size > MAX_BYTES)) return Response.json({ error: "bad_request" }, { status: 400 });

  let slideTexts: string[] = [];
  try {
    const parsed = JSON.parse(String(form?.get("slideTexts") ?? "[]")) as unknown;
    if (Array.isArray(parsed)) slideTexts = parsed.map(String);
  } catch {
    // Optional: the analyser just has less to go on.
  }
  const title = String(form?.get("title") ?? "").trim();
  if (!title) return Response.json({ error: "bad_request" }, { status: 400 });

  let post = addPost(
    { title, caption: String(form?.get("caption") ?? ""), format: String(form?.get("format") ?? ""), slideTexts },
    await Promise.all(slides.map(async (s) => new Uint8Array(await s.arrayBuffer()))),
  );
  if ((await getSettings(store)).autoDrafts && (await draftsReady(store))) {
    post = (await sendPostToDrafts(store, post.id)) ?? post;
  }
  return Response.json({ post });
}
