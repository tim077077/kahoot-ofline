import "server-only";
import { AwsClient } from "aws4fetch";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Where album photos live. Production uses any S3-compatible bucket;
// Cloudflare R2 is the recommended one (10 GB free, then $0.015/GB-month, and
// no fee for people viewing their photos). Local dev writes to .data/ so the
// album works with zero setup.

export interface ObjectStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  del(key: string): Promise<void>;
  // A URL the phone can load directly, valid for `seconds`.
  url(key: string, seconds: number): Promise<string>;
}

class S3Store implements ObjectStore {
  private client: AwsClient;

  constructor(
    private endpoint: string,
    private bucket: string,
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
  ) {
    this.client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region });
  }

  private objectUrl(key: string) {
    return `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  async put(key: string, body: Uint8Array, contentType: string) {
    const res = await this.client.fetch(this.objectUrl(key), {
      method: "PUT",
      body: Buffer.from(body),
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=31536000, immutable" },
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  }

  async get(key: string) {
    const res = await this.client.fetch(this.objectUrl(key));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async del(key: string) {
    const res = await this.client.fetch(this.objectUrl(key), { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error(`Delete failed: ${res.status}`);
  }

  async url(key: string, seconds: number) {
    const target = new URL(this.objectUrl(key));
    target.searchParams.set("X-Amz-Expires", String(seconds));
    const signed = await this.client.sign(target.toString(), { method: "GET", aws: { signQuery: true } });
    return signed.url;
  }
}

// Development only: files on disk, served by /api/dev-file with a signed URL.
class DiskStore implements ObjectStore {
  private root = path.join(process.cwd(), ".data", "objects");

  private file(key: string) {
    const resolved = path.join(this.root, key);
    if (!resolved.startsWith(this.root + path.sep)) throw new Error("bad key");
    return resolved;
  }

  async put(key: string, body: Uint8Array) {
    await mkdir(path.dirname(this.file(key)), { recursive: true });
    await writeFile(this.file(key), body);
  }

  async del(key: string) {
    await rm(this.file(key), { force: true });
  }

  async read(key: string) {
    return readFile(this.file(key));
  }

  async get(key: string) {
    return this.read(key).catch(() => null);
  }

  async url(key: string, seconds: number) {
    const exp = Date.now() + seconds * 1000;
    return `/api/dev-file?key=${encodeURIComponent(key)}&exp=${exp}&sig=${devSignature(key, exp)}`;
  }
}

function devSignature(key: string, exp: number) {
  return createHmac("sha256", process.env.DEV_FILE_SECRET ?? "local-dev-only").update(`${key}:${exp}`).digest("hex");
}

export function verifyDevSignature(key: string, exp: number, sig: string) {
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = Buffer.from(devSignature(key, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export class ObjectsNotConfiguredError extends Error {
  constructor() {
    super("Photo storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
  }
}

const globalForObjects = globalThis as unknown as { __objects?: ObjectStore };

// The endpoint as people tend to paste it: with spaces or quotes around it,
// without https://, as just the account id, or with the bucket name on the
// end. All of those mean https://<account-id>.r2.cloudflarestorage.com.
export function normalizeEndpoint(raw: string) {
  let value = raw.trim().replace(/^["']|["']$/g, "").trim();
  if (/^[0-9a-f]{32}$/i.test(value)) value = `${value}.r2.cloudflarestorage.com`;
  if (!/^[a-z]+:\/\//i.test(value)) value = `https://${value}`;
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

export function getObjects(): ObjectStore {
  if (globalForObjects.__objects) return globalForObjects.__objects;
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = process.env;
  if (S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
    globalForObjects.__objects = new S3Store(normalizeEndpoint(S3_ENDPOINT), S3_BUCKET.trim(), S3_ACCESS_KEY_ID.trim(), S3_SECRET_ACCESS_KEY.trim(), S3_REGION?.trim() || "auto");
  } else if (process.env.NODE_ENV === "production") {
    throw new ObjectsNotConfiguredError();
  } else {
    globalForObjects.__objects = new DiskStore();
  }
  return globalForObjects.__objects;
}

export function getDiskStore(): DiskStore | null {
  const objects = getObjects();
  return objects instanceof DiskStore ? objects : null;
}
