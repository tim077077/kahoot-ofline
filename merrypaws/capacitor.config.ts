import type { CapacitorConfig } from "@capacitor/cli";

// The Android/iOS app: the client from `npm run app:build` (out/), talking to
// the deployed site's /api through NEXT_PUBLIC_API_BASE.
const config: CapacitorConfig = {
  appId: "com.pawpictures.app",
  appName: "Paw Pictures",
  webDir: "out",
  backgroundColor: "#f5eee3",
};

export default config;
