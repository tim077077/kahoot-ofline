// Tiny key-value store. Production uses Upstash Redis over its REST API (free
// tier, one-click on Vercel). Local dev falls back to an in-memory map so the
// app runs with zero setup.

export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ex?: number; nx?: boolean }): Promise<boolean>;
  incrby(key: string, by: number): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
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
}

export class StoreNotConfiguredError extends Error {
  constructor() {
    super("Storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
  }
}

const globalForStore = globalThis as unknown as { __mobilatStore?: Store };

export function getStore(): Store {
  if (globalForStore.__mobilatStore) return globalForStore.__mobilatStore;

  // Vercel's Upstash integration names the variables KV_REST_API_*.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    globalForStore.__mobilatStore = new UpstashStore(url, token);
  } else if (process.env.NODE_ENV === "production") {
    // An in-memory store on serverless would silently lose paid credits.
    throw new StoreNotConfiguredError();
  } else {
    globalForStore.__mobilatStore = new MemoryStore();
  }
  return globalForStore.__mobilatStore;
}
