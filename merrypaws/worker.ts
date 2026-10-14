// The Cloudflare Worker: OpenNext's Next.js handler, plus the hourly Cron
// Trigger from wrangler.jsonc, which calls the reminder route the same way an
// outside scheduler would.

// Built by `opennextjs-cloudflare build`, so it may or may not exist when
// type-checking; ts-ignore (not ts-expect-error) passes either way.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";

type Env = { CRON_SECRET?: string; NEXT_PUBLIC_SITE_URL?: string };

const worker = {
  fetch: handler.fetch,

  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const base = (env.NEXT_PUBLIC_SITE_URL || "https://localhost").replace(/\/$/, "");
    const request = new Request(`${base}/api/push/cron`, { headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` } });
    const res: Response = await handler.fetch(request, env, ctx);
    if (!res.ok) console.error(JSON.stringify({ event: "cron_failed", status: res.status, body: await res.text() }));
  },
};

export default worker;
