import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives in a subfolder of a repo with its own lockfile; pin the
  // workspace root to this folder.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  // The dev badge sits on top of the bottom tab bar.
  devIndicators: false,
};

export default nextConfig;
