import { forbidCrossSite, storeOr503 } from "@/lib/http";
import { getSettings } from "@/lib/posting";
import { listPosts } from "@/lib/queue";

// The SlideDrop Poster extension asks here what to post. Each call also
// counts as "the extension is connected" for the dashboard.
export async function GET(request: Request) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  const store = storeOr503();
  if (store instanceof Response) return store;
  await store.set("extension:lastSeen", new Date().toISOString());
  const settings = await getSettings(store);
  const posts = listPosts()
    .filter((p) => p.channel === "extension" && p.status === "ready")
    .reverse()
    .map((p) => ({ id: p.id, title: p.title, caption: p.caption, slideCount: p.slideCount }));
  return Response.json({ posts, gap: settings.extensionGap, sound: settings.extensionSound });
}
