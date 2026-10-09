import { NextResponse, type NextRequest } from "next/server";

// SlideDrop is a tool for your own computer. When you open a tunnel so TikTok
// can fetch slide images (official drafts), the whole app would be on the
// internet. This lets the outside world reach exactly two things: slide
// images (which also need a signature, see /api/posts/[id]/slides/[n]) and
// the TikTok login callback. Everything else answers 404 from outside.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const PUBLIC_PATHS = [/^\/api\/posts\/p_[a-z0-9]+\/slides\/\d+$/, /^\/api\/tiktok\/callback$/];

export function isFromOutside(request: Request) {
  const host = (request.headers.get("host") ?? "").replace(/:\d+$/, "").toLowerCase();
  // Cloudflare tunnels always add cf-connecting-ip, even if they rewrite the host.
  return !LOCAL_HOSTS.has(host) || request.headers.has("cf-connecting-ip");
}

export function proxy(request: NextRequest) {
  if (!isFromOutside(request)) return NextResponse.next();
  if (PUBLIC_PATHS.some((re) => re.test(request.nextUrl.pathname))) return NextResponse.next();
  return new NextResponse("Not found", { status: 404 });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
