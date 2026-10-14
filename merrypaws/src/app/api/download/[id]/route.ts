import { BRAND } from "@/lib/config";
import { storeOr503 } from "@/lib/http";
import { getPortrait, isUnlocked } from "@/lib/portraits";
import { getObjects } from "@/lib/objects";

// Full-resolution download, only for unlocked portraits. The portrait id is a
// random UUID only the creator has seen.
export async function GET(_request: Request, ctx: RouteContext<"/api/download/[id]">) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const { id } = await ctx.params;
  const portrait = await getPortrait(store, id);
  if (!portrait) return new Response("This portrait has expired.", { status: 404 });
  if (!(await isUnlocked(store, id))) return new Response("Unlock this portrait first.", { status: 402 });

  const bytes = await getObjects().get(portrait.fullKey);
  if (!bytes) return new Response("This portrait has expired.", { status: 404 });
  const ext = portrait.mimeType === "image/png" ? "png" : "jpg";
  const filename = `${BRAND.toLowerCase().replace(/\s+/g, "-")}-${portrait.style}.${ext}`;
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": portrait.mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
