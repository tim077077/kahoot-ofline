import type { ObjectStore } from "@/lib/objects";

// An object store that lives in a Map, for tests.
export class MemoryObjects implements ObjectStore {
  files = new Map<string, { body: Buffer; contentType: string }>();
  async put(key: string, body: Uint8Array, contentType: string) {
    this.files.set(key, { body: Buffer.from(body), contentType });
  }
  async get(key: string) {
    return this.files.get(key)?.body ?? null;
  }
  async del(key: string) {
    this.files.delete(key);
  }
  async url(key: string) {
    return `memory://${key}`;
  }
}

export const fakeImage = { bytes: new Uint8Array([0xff, 0xd8, 0xff]), mimeType: "image/jpeg" };
