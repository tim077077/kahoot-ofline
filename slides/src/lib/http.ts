import { getStore, StoreNotConfiguredError, type Store } from "./store";

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

// Resolve the store, or a 503 response when production storage is missing.
export function storeOr503(): Store | Response {
  try {
    return getStore();
  } catch (err) {
    if (err instanceof StoreNotConfiguredError) return Response.json({ error: "not_configured" }, { status: 503 });
    throw err;
  }
}

// Requests that change data must carry this header. A web page on another
// site can't add custom headers to a request to localhost without a CORS
// preflight (which SlideDrop never approves), so this blocks cross-site
// requests to your local tool. The studio and the extension both send it.
export const APP_HEADER = "x-slidedrop";

export function forbidCrossSite(request: Request): Response | null {
  return request.headers.get(APP_HEADER) === "1" ? null : Response.json({ error: "forbidden" }, { status: 403 });
}
