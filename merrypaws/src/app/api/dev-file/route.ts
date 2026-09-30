import { getDiskStore, verifyDevSignature } from "@/lib/objects";

// Serves album photos from .data/ in local development. Production photos are
// loaded straight from the bucket with signed URLs, so this route 404s there.
export async function GET(request: Request) {
  const disk = process.env.NODE_ENV === "production" ? null : getDiskStore();
  if (!disk) return new Response("not found", { status: 404 });
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  if (!verifyDevSignature(key, Number(url.searchParams.get("exp")), url.searchParams.get("sig") ?? "")) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    return new Response(new Uint8Array(await disk.read(key)), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
