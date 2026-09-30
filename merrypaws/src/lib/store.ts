// Tiny key-value store. Production uses Upstash Redis over its REST API (free
// tier, one-click on Vercel). Local dev falls back to an in-memory map so the
// app runs with zero setup.

export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ex?: number; nx?: boolean }): Promise<boolean>;
  incrby(key: string, by: number): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
  // Hashes hold one record per field (the album's photos).
  hset(key: string, field: string, value: string): Promise<void>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, field: string): Promise<void>;
  hlen(key: string): Promise<number>;
}

class UpstashStore implements Store {
  constructor(private url: string, private token: string) {}

  private async cmd<T>(args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const body = (await res.json()) as { result?: T; error?: string };
    if (!res.ok || body.error) throw new Error(`Upstash ${args[0]} failed: ${body.error ?? res.status}`);
    return body.result as T;
  }

  get(key: string) {
    return this.cmd<string | null>(["GET", key]);
  }

  async set(key: string, value: string, opts: { ex?: number; nx?: boolean } = {}) {
    const args: (string | number)[] = ["SET", key, value];
    if (opts.ex) args.push("EX", opts.ex);
    if (opts.nx) args.push("NX");
    return (await this.cmd<string | null>(args)) === "OK";
  }

  incrby(key: string, by: number) {
    return this.cmd<number>(["INCRBY", key, by]);
  }

  async expire(key: string, seconds: number) {
    await this.cmd<number>(["EXPIRE", key, seconds]);
  }

  async del(key: string) {
    await this.cmd<number>(["DEL", key]);
  }

  async hset(key: string, field: string, value: string) {
    await this.cmd<number>(["HSET", key, field, value]);
  }

  hget(key: string, field: string) {
    return this.cmd<string | null>(["HGET", key, field]);
  }

  async hgetall(key: string) {
    const flat = (await this.cmd<string[] | null>(["HGETALL", key])) ?? [];
    const out: Record<string, string> = {};
    for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
    return out;
  }

  async hdel(key: string, field: string) {
    await this.cmd<number>(["HDEL", key, field]);
  }

  hlen(key: string) {
    return this.cmd<number>(["HLEN", key]);
  }
}

export class MemoryStore implements Store {
  private data = new Map<string, { value: string; expiresAt?: number }>();

  private live(key: string) {
    const entry = this.data.get(key);
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  async get(key: string) {
    return this.live(key)?.value ?? null;
  }

  async set(key: string, value: string, opts: { ex?: number; nx?: boolean } = {}) {
    if (opts.nx && this.live(key)) return false;
    this.data.set(key, { value, expiresAt: opts.ex ? Date.now() + opts.ex * 1000 : undefined });
    return true;
  }

  async incrby(key: string, by: number) {
    const entry = this.live(key);
    const next = Number(entry?.value ?? 0) + by;
    this.data.set(key, { value: String(next), expiresAt: entry?.expiresAt });
    return next;
  }

  async expire(key: string, seconds: number) {
    const entry = this.live(key);
    if (entry) entry.expiresAt = Date.now() + seconds * 1000;
  }

  async del(key: string) {
    this.data.delete(key);
    this.hashes.delete(key);
  }

  private hashes = new Map<string, Map<string, string>>();

  async hset(key: string, field: string, value: string) {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    hash.set(field, value);
    this.hashes.set(key, hash);
  }

  async hget(key: string, field: string) {
    return this.hashes.get(key)?.get(field) ?? null;
  }

  async hgetall(key: string) {
    return Object.fromEntries(this.hashes.get(key) ?? []);
  }

  async hdel(key: string, field: string) {
    this.hashes.get(key)?.delete(field);
  }

  async hlen(key: string) {
    return this.hashes.get(key)?.size ?? 0;
  }
}

export class StoreNotConfiguredError extends Error {
  constructor() {
    super("Storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
  }
}

const globalForStore = globalThis as unknown as { __appStore?: Store };

export function getStore(): Store {
  if (globalForStore.__appStore) return globalForStore.__appStore;

  // Vercel's Upstash integration names the variables KV_REST_API_*.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    globalForStore.__appStore = new UpstashStore(url, token);
  } else if (process.env.NODE_ENV === "production") {
    // An in-memory store on serverless would silently lose paid credits.
    throw new StoreNotConfiguredError();
  } else {
    globalForStore.__appStore = new MemoryStore();
  }
  return globalForStore.__appStore;
}
