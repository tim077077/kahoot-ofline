import { afterEach, describe, expect, it, vi } from "vitest";
import { fcmSender } from "./fcm";
import { MemoryStore } from "./store";

vi.mock("server-only", () => ({}));

async function serviceAccount() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const b64 = btoa(String.fromCharCode(...der)).replace(/(.{64})/g, "$1\n");
  return { pair, json: JSON.stringify({ project_id: "paw-test", client_email: "push@paw-test.iam.gserviceaccount.com", private_key: `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n` }) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fcm sender", () => {
  it("is off without a service account", () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "");
    expect(fcmSender(new MemoryStore())).toBeNull();
  });

  it("signs a valid token request, caches it, and reports dead tokens", async () => {
    const { pair, json } = await serviceAccount();
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", json);
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        if (url.includes("oauth2")) return Response.json({ access_token: "ya29.test", expires_in: 3600 });
        const { message } = JSON.parse(String(init.body)) as { message: { token: string } };
        return message.token === "dead" ? new Response('{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}', { status: 404 }) : Response.json({ name: "ok" });
      }),
    );
    const send = fcmSender(new MemoryStore())!;
    expect(await send("alive", { title: "🐾 from Milo", body: "They loved it.", data: { tab: "pack" } })).toBe("sent");
    expect(await send("dead", { title: "t", body: "b" })).toBe("gone");

    // One sign-in for both sends, and Google would accept its signature.
    const auth = calls.filter((c) => c.url.includes("oauth2"));
    expect(auth).toHaveLength(1);
    const jwt = new URLSearchParams(String(auth[0].init.body)).get("assertion")!;
    const [h, c, sig] = jwt.split(".");
    const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (ch) => ch.charCodeAt(0));
    expect(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", pair.publicKey, unb64(sig), new TextEncoder().encode(`${h}.${c}`))).toBe(true);
    expect(JSON.parse(new TextDecoder().decode(unb64(c)))).toMatchObject({ iss: "push@paw-test.iam.gserviceaccount.com", aud: "https://oauth2.googleapis.com/token" });

    const sendCall = calls.find((c) => c.url.includes("fcm.googleapis.com"))!;
    expect(sendCall.url).toBe("https://fcm.googleapis.com/v1/projects/paw-test/messages:send");
    expect(new Headers(sendCall.init.headers).get("authorization")).toBe("Bearer ya29.test");
  });
});
