import { createECDH, createPublicKey, randomBytes, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encryptPayload, vapidHeader } from "./webpushCrypto";

// Decrypts like a browser would (RFC 8291), with Node's own crypto, so the
// test doesn't trust the code it checks.
async function decrypt(body: Uint8Array, receiver: ReturnType<typeof createECDH>, auth: Buffer) {
  const salt = body.subarray(0, 16);
  const idlen = body[20];
  const senderPublic = Buffer.from(body.subarray(21, 21 + idlen));
  const cipher = body.subarray(21 + idlen);
  const { hkdfSync, createDecipheriv } = await import("node:crypto");
  const shared = receiver.computeSecret(senderPublic);
  const info = Buffer.concat([Buffer.from("WebPush: info\0"), receiver.getPublicKey(), senderPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", shared, auth, info, 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const decipher = createDecipheriv("aes-128-gcm", cek, nonce);
  decipher.setAuthTag(cipher.subarray(cipher.length - 16));
  const plain = Buffer.concat([decipher.update(cipher.subarray(0, cipher.length - 16)), decipher.final()]);
  expect(plain[plain.length - 1]).toBe(2);
  return plain.subarray(0, -1).toString();
}

describe("web push", () => {
  it("encrypts a payload the phone can decrypt (aes128gcm)", async () => {
    const phone = createECDH("prime256v1");
    phone.generateKeys();
    const auth = randomBytes(16);
    const body = await encryptPayload(new TextEncoder().encode('{"title":"hi"}'), phone.getPublicKey("base64url"), auth.toString("base64url"));
    expect(new DataView(body.buffer).getUint32(16)).toBe(4096);
    expect(await decrypt(body, phone, auth)).toBe('{"title":"hi"}');
  });

  it("signs a VAPID token the push service can verify", async () => {
    const server = createECDH("prime256v1");
    server.generateKeys();
    const header = await vapidHeader("https://fcm.googleapis.com/fcm/send/abc", server.getPublicKey("base64url"), server.getPrivateKey("base64url"), "mailto:a@b.c");
    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!;
    expect(k).toBe(server.getPublicKey("base64url"));
    const [h, c, s] = token.split(".");
    expect(JSON.parse(Buffer.from(c, "base64url").toString())).toMatchObject({ aud: "https://fcm.googleapis.com", sub: "mailto:a@b.c" });
    const point = server.getPublicKey();
    const key = createPublicKey({ key: { kty: "EC", crv: "P-256", x: point.subarray(1, 33).toString("base64url"), y: point.subarray(33).toString("base64url") }, format: "jwk" });
    expect(verify("sha256", Buffer.from(`${h}.${c}`), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"))).toBe(true);
  });
});
