import type { CapacitorConfig } from "@capacitor/cli";

// The Android/iOS app: the client from `npm run app:build` (out/), talking to
// the deployed site's /api through NEXT_PUBLIC_API_BASE.
const config: CapacitorConfig = {
  appId: "com.pawpictures.app",
  appName: "Paw Pictures",
  webDir: "out",
  backgroundColor: "#f5eee3",
  plugins: {
    // A friend's reaction shows even while the app is open.
    FirebaseMessaging: { presentationOptions: ["alert", "sound"] },
  },
  experimental: {
    ios: {
      // Avoids a Swift Package Manager name clash (the plugin's README).
      spm: { packageOptions: { "@capacitor-firebase/messaging": { symlink: true } } },
    },
  },
};

export default config;
