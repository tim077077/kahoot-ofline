import type { NextConfig } from "next";

// `npm run app:build` sets APP_EXPORT=1 to build the client as static files
// for the Android/iOS app (Capacitor); the API stays on the deployed site.
const appExport = process.env.APP_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(appExport ? { output: "export" as const, images: { unoptimized: true } } : {}),
  // This app lives in a subfolder of a repo with its own lockfile; pin the
  // workspace root to this folder.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  // The dev badge sits on top of the bottom tab bar.
  devIndicators: false,
  // Static files have no server to send headers; the app build skips them.
  headers: appExport ? undefined : async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // The service worker must never be cached, or reminder fixes never land.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
