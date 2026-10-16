// The Cloudflare Worker: OpenNext's Next.js handler, plus the hourly Cron
// Trigger from wrangler.jsonc, which calls the reminder route the same way an
// outside scheduler would.

// Built by `opennextjs-cloudflare build`, so it may or may not exist when
// type-checking; ts-ignore (not ts-expect-error) passes either way.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";

type Env = { CRON_SECRET?: string; NEXT_PUBLIC_SITE_URL?: string };

// The Android and iOS apps (Capacitor) load the client from these origins and
// call /api/* here, so those calls need CORS. Auth is a bearer token, never a
// cookie, so no credentials are allowed.
const APP_ORIGINS = new Set(["https://localhost", "capacitor://localhost"]);
const CORS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Device",
  "Access-Control-Max-Age": "86400",
};

async function fetchWithCors(request: Request, env: Env, ctx: unknown): Promise<Response> {
  const origin = request.headers.get("origin") ?? "";
  const isApi = new URL(request.url).pathname.startsWith("/api/");
  if (!isApi || !APP_ORIGINS.has(origin)) return handler.fetch(request, env, ctx);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Origin": origin, Vary: "Origin" } });
  const res: Response = await handler.fetch(request, env, ctx);
  const out = new Response(res.body, res);
  out.headers.set("Access-Control-Allow-Origin", origin);
  out.headers.append("Vary", "Origin");
  return out;
}

const worker = {
  fetch: fetchWithCors,

  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const base = (env.NEXT_PUBLIC_SITE_URL || "https://localhost").replace(/\/$/, "");
    const request = new Request(`${base}/api/push/cron`, { headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` } });
    const res: Response = await handler.fetch(request, env, ctx);
    if (!res.ok) console.error(JSON.stringify({ event: "cron_failed", status: res.status, body: await res.text() }));
  },
};

export default worker;
