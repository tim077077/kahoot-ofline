import { afterEach, describe, expect, it, vi } from "vitest";
import { checkStorage, missing, storageHint } from "./health";
import { normalizeEndpoint, type ObjectStore } from "./objects";

vi.mock("server-only", () => ({}));

const ENDPOINT = "https://abc123.r2.cloudflarestorage.com";

function setStorageEnv() {
  vi.stubEnv("S3_ENDPOINT", ENDPOINT);
  vi.stubEnv("S3_BUCKET", "paw-pictures");
  vi.stubEnv("S3_ACCESS_KEY_ID", "id");
  vi.stubEnv("S3_SECRET_ACCESS_KEY", "secret");
}

function memoryObjects(failWith?: Error): ObjectStore {
  const files = new Map<string, Uint8Array>();
  return {
    async put(key, body) {
      if (failWith) throw failWith;
      files.set(key, body);
    },
    async get(key) {
      const f = files.get(key);
      return f ? Buffer.from(f) : null;
    },
    async del(key) {
      files.delete(key);
    },
    async url(key) {
      return key;
    },
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("health", () => {
  it("names missing settings, never values", () => {
    expect(missing(["A", "B", "C"], { A: "x", C: "" })).toEqual(["B", "C"]);
  });

  it("says which storage setting is missing", async () => {
    setStorageEnv();
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "");
    expect(await checkStorage(() => memoryObjects())).toEqual({ ok: false, hint: "Missing: S3_SECRET_ACCESS_KEY" });
  });

  it("passes when a file goes in and comes back, and leaves nothing behind", async () => {
    setStorageEnv();
    const objects = memoryObjects();
    expect(await checkStorage(() => objects)).toEqual({ ok: true });
    expect(await objects.get("health/check.txt")).toBeNull();
  });

  it("turns R2 errors into something to fix", async () => {
    setStorageEnv();
    expect((await checkStorage(() => memoryObjects(new Error("Upload failed: 403")))).hint).toMatch(/same R2 token/);
    expect(storageHint(new Error("Upload failed: 404"), ENDPOINT)).toMatch(/Bucket not found/);
    expect(storageHint(new Error("Upload failed: 403"), `${ENDPOINT}/paw-pictures`)).toMatch(/same R2 token/);
    expect(storageHint(new TypeError("fetch failed"), ENDPOINT)).toMatch(/Can't reach/);
    expect(storageHint(new Error("x"), "my r2 endpoint")).toMatch(/isn't a web address/);
  });

  it("accepts the endpoint the ways people paste it", () => {
    const id = "0123456789abcdef0123456789abcdef";
    const want = `https://${id}.r2.cloudflarestorage.com`;
    for (const pasted of [want, `${want}/`, `${want}/paw-pictures`, ` ${want} `, `"${want}"`, `${id}.r2.cloudflarestorage.com`, id]) {
      expect(normalizeEndpoint(pasted)).toBe(want);
    }
    expect(normalizeEndpoint("https://abc.eu.r2.cloudflarestorage.com")).toBe("https://abc.eu.r2.cloudflarestorage.com");
  });
});
