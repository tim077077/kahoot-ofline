// Web Push (RFC 8291, aes128gcm) and VAPID (RFC 8292) with Web Crypto only,
// so it runs the same on Node and Cloudflare Workers. web-push needs Node's
// createECDH and https, which Workers don't have.

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const fromB64url = (text: string) => new Uint8Array(Buffer.from(text, "base64url"));
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource }, key, length * 8);
  return new Uint8Array(bits);
}

// web-push style keys (raw base64url) as a signing key. The public key is the
// uncompressed point: 0x04, then 32 bytes of x, then 32 of y.
export async function vapidSigningKey(publicKey: string, privateKey: string) {
  const point = fromB64url(publicKey);
  if (point.length !== 65 || point[0] !== 4) throw new Error("The VAPID public key is not a P-256 public key");
  const jwk: JsonWebKey = { kty: "EC", crv: "P-256", x: b64url(point.subarray(1, 33)), y: b64url(point.subarray(33)), d: privateKey };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

export async function vapidHeader(endpoint: string, publicKey: string, privateKey: string, subject: string) {
  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const key = await vapidSigningKey(publicKey, privateKey);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64url(new Uint8Array(signature))}, k=${publicKey}`;
}

// One record, as push services expect: salt, record size, the sender's
// one-time public key, then the AES-GCM ciphertext of payload + 0x02.
export async function encryptPayload(payload: Uint8Array, p256dh: string, auth: string) {
  const receiverKey = fromB64url(p256dh);
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const localPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const receiver = await crypto.subtle.importKey("raw", receiverKey as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: receiver }, local.privateKey, 256));

  const ikm = await hkdf(fromB64url(auth), shared, concat(enc.encode("WebPush: info\0"), receiverKey, localPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const key = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, concat(payload, new Uint8Array([2])) as BufferSource));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([localPublic.length]), localPublic, cipher);
}
