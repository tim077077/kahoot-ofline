import { LIMITS } from "@/lib/config";
import { getPoster } from "@/lib/posting";

const MAX_SLIDE_BYTES = 3 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const slides = (form?.getAll("slide") ?? []).filter((s): s is File => s instanceof Blob);
  const caption = String(form?.get("caption") ?? "").slice(0, 2200);

  if (slides.length === 0 || slides.length > LIMITS.maxSlides) return Response.json({ error: "bad_request" }, { status: 400 });
  if (slides.some((s) => !s.type.startsWith("image/") || s.size > MAX_SLIDE_BYTES)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await getPoster().sendToDrafts(slides, caption);
  return Response.json(result);
}
