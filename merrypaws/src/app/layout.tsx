import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Jost, Pinyon_Script } from "next/font/google";
import { BRAND, siteUrl } from "@/lib/config";
import "./globals.css";

// A high-contrast heritage serif for titles, a copperplate script for the
// star's name, and a 1920s geometric sans for everything you read.
const bodoni = Bodoni_Moda({ variable: "--font-bodoni", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"] });
const pinyon = Pinyon_Script({ variable: "--font-pinyon", subsets: ["latin"], weight: "400" });
const jost = Jost({ variable: "--font-jost", subsets: ["latin"] });

const title = `${BRAND}: turn your pet into a memory`;
const description =
  "A vintage portrait of your pet, and you too if you like: an old-master painting, a 1970s summer snapshot, film noir and more. Your first one is free.";

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
    <html lang="en" className={`${bodoni.variable} ${pinyon.variable} ${jost.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-base">{children}</body>
    </html>
  );
}
