// Same-origin proxy for generated images, so the browser can draw them on a
// canvas (to add the "virtually staged" label) and download them.
function isAllowed(url: URL) {
  const host = url.hostname;
  return url.protocol === "https:" && (host === "fal.media" || host.endsWith(".fal.media") || host.endsWith(".fal.ai"));
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (!isAllowed(target)) return new Response("forbidden", { status: 403 });

  const upstream = await fetch(target, { cache: "no-store" });
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !type.startsWith("image/")) return new Response("not found", { status: 404 });

  return new Response(upstream.body, {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" },
  });
}
