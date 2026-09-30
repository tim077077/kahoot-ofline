import { createHash } from "node:crypto";
import { getObjects, ObjectsNotConfiguredError, type ObjectStore } from "./objects";
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

// A guest is a device (a random id the app keeps) on a network. Old clients
// without the header are counted per IP.
export function guestOf(request: Request) {
  const ip = clientIp(request);
  const device = request.headers.get("x-device");
  return { ip, device: device && /^[\w-]{16,64}$/.test(device) ? device : `ip:${ip}` };
}

export function objectsOr503(): ObjectStore | Response {
  try {
    return getObjects();
  } catch (err) {
    if (err instanceof ObjectsNotConfiguredError) return Response.json({ error: "not_configured" }, { status: 503 });
    throw err;
  }
}

// The store plus the signed-in account, or the error response to return.
export async function memberOr401(request: Request): Promise<{ store: Store; accountId: string } | Response> {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const accountId = token && token.length >= 16 && token.length <= 128
    ? await store.get(`tok:${createHash("sha256").update(token).digest("hex")}`)
    : null;
  if (!accountId) return Response.json({ error: "no_account" }, { status: 401 });
  return { store, accountId };
}
