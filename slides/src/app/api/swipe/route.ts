import { forbidCrossSite } from "@/lib/http";
import { addSwipe, listSwipe } from "@/lib/swipe";
import { parseTikTokUrl, TikTokLinkError } from "@/lib/tiktok";

export async function GET() {
  return Response.json({ items: listSwipe() });
}

export async function POST(request: Request) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  const body = ((await request.json().catch(() => ({}))) ?? {}) as { link?: unknown; note?: unknown };
  let link = String(body.link ?? "").trim();
  if (link && !/^[a-z]+:\/\//i.test(link)) link = `https://${link}`;
  if (!parseTikTokUrl(link)) return Response.json({ error: "bad_link" }, { status: 400 });
  try {
    return Response.json({ item: await addSwipe(link, String(body.note ?? "")) });
  } catch (err) {
    if (err instanceof TikTokLinkError) return Response.json({ error: "link_unavailable" }, { status: 422 });
    throw err;
  }
}
