import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Homemade_Apple, Jost, Pinyon_Script } from "next/font/google";
import { BRAND, siteUrl } from "@/lib/config";
import "./globals.css";

// A high-contrast heritage serif for titles, a copperplate script for the
// star's name, a 1920s geometric sans for everything you read, and ink
// handwriting for captions.
const bodoni = Bodoni_Moda({ variable: "--font-bodoni", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"] });
const pinyon = Pinyon_Script({ variable: "--font-pinyon", subsets: ["latin"], weight: "400" });
const jost = Jost({ variable: "--font-jost", subsets: ["latin"] });
// Ink handwriting for captions and dates, like the back of an old photo.
const hand = Homemade_Apple({ variable: "--font-hand", subsets: ["latin"], weight: "400" });

const title = `${BRAND}: a vintage album for your pet`;
const description =
  "Keep your pet's photos like a treasured family album, with highlights, film looks and vintage portraits. Free to start.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title,
  description,
  openGraph: { title, description },
  appleWebApp: { capable: true, title: BRAND, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5eee3" },
    { media: "(prefers-color-scheme: dark)", color: "#1c130e" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodoni.variable} ${pinyon.variable} ${jost.variable} ${hand.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-base">{children}</body>
    </html>
  );
}
