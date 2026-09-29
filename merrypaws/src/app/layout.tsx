import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Courier_Prime, Jost } from "next/font/google";
import { BRAND, siteUrl } from "@/lib/config";
import "./globals.css";

// Marquee condensed for titles, a 1920s geometric sans for the interface,
// and screenplay Courier for credits and slate details.
const shoulders = Big_Shoulders({ variable: "--font-shoulders", subsets: ["latin"], axes: ["opsz"] });
const jost = Jost({ variable: "--font-jost", subsets: ["latin"] });
const courier = Courier_Prime({ variable: "--font-courier", subsets: ["latin"], weight: ["400", "700"] });

const title = `${BRAND}: your pet, starring in a classic film`;
const description =
  "Turn a photo of your pet (and you) into a still from a classic film: old-master portraits, film noir, Technicolor and more. Free preview.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title,
  description,
  openGraph: { title, description },
  appleWebApp: { capable: true, title: BRAND, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0c0d10",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${shoulders.variable} ${jost.variable} ${courier.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {children}
        <div className="vignette" aria-hidden />
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
