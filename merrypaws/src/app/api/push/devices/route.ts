import { fcmConfigured } from "@/lib/fcm";
import { memberOr401 } from "@/lib/http";
import { removeDeviceToken, saveDeviceToken } from "@/lib/nativePush";

// The Android and iOS apps register their Firebase token here (on every open,
// since tokens rotate) so friends' reactions can reach the phone.
const validToken = (t: unknown): t is string => typeof t === "string" && t.length >= 20 && t.length <= 4096 && /^[\w:.\-]+$/.test(t);

export async function PUT(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  if (!fcmConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const { token, platform } = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!validToken(token) || (platform !== "android" && platform !== "ios")) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  await saveDeviceToken(ctx.store, ctx.accountId, token, platform);
  return new Response(null, { status: 204 });
}

// Signing out on this phone.
export async function DELETE(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const { token } = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!validToken(token)) return Response.json({ error: "bad_request" }, { status: 400 });
  await removeDeviceToken(ctx.store, ctx.accountId, token);
  return new Response(null, { status: 204 });
}
