import { storeOr503 } from "@/lib/http";
import { readSlide } from "@/lib/queue";
import { verifySlideSignature } from "@/lib/tiktok-official";
import { isFromOutside } from "@/proxy";

// A queued slide as JPEG. From this computer: always. From outside (TikTok
// downloading a draft through your tunnel): only with a valid signature.
export async function GET(request: Request, ctx: RouteContext<"/api/posts/[id]/slides/[n]">) {
  const { id, n } = await ctx.params;
  const index = Number(n);
  if (isFromOutside(request)) {
    const store = storeOr503();
    if (store instanceof Response) return store;
    const sig = new URL(request.url).searchParams.get("sig");
    if (!(await verifySlideSignature(store, id, index, sig))) return new Response("Not found", { status: 404 });
  }
  const bytes = readSlide(id, index);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" } });
}
