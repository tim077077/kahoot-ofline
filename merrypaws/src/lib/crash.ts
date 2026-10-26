"use client";

import { API_BASE } from "./client";

// Crashes on someone's phone, sent to our own Worker so they show up in the
// Cloudflare logs. No third-party SDK: just the message, where it happened
// and the first lines of the stack.

const MAX_PER_PAGE = 5;
const seen = new Set<string>();

// Noise every web app sees that says nothing about ours: browser extensions,
// a flaky connection, a request the app cancelled itself.
const IGNORE = [/^Script error\.?$/i, /ResizeObserver loop/i, /Failed to fetch/i, /Load failed/i, /NetworkError/i, /AbortError/i, /^network$/i];

export function reportCrash(error: unknown, where: string) {
  try {
    const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : "non_error_thrown");
    const message = err.message || err.name || "unknown";
    if (IGNORE.some((re) => re.test(message))) return;
    const key = `${where}:${message}`;
    if (seen.has(key) || seen.size >= MAX_PER_PAGE) return;
    seen.add(key);
    const body = JSON.stringify({
      where,
      message,
      stack: err.stack ?? "",
      digest: (err as Error & { digest?: string }).digest,
      page: location.pathname,
      ua: navigator.userAgent,
    });
    // text/plain keeps it a simple request: no CORS preflight from the app.
    void fetch(`${API_BASE}/api/crash`, { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
  } catch {
    // Reporting must never be the second crash.
  }
}

let installed = false;

export function installCrashReporting() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => reportCrash(e.error ?? e.message, "window"));
  window.addEventListener("unhandledrejection", (e) => reportCrash(e.reason, "promise"));
}
