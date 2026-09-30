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
