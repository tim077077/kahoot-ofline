import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/config";

// Lets people add the album to their home screen. On iPhone that's also what
// unlocks the daily reminder (web push needs a home-screen app there).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND,
    short_name: BRAND,
    description: "A vintage album for your pet.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5eee3",
    theme_color: "#f5eee3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
