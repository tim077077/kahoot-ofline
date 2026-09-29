import type { Metadata } from "next";
import { Fraunces, Montserrat } from "next/font/google";
import { BRAND, siteUrl } from "@/lib/config";
import "./globals.css";

// Montserrat is also used to draw the slides on canvas, so load the weights
// the renderer needs.
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600"] });

const title = `${BRAND} — viral TikTok slideshows in a minute`;
const description =
  "Pick a proven viral slideshow format, let AI write it for your topic, and download ready-to-post TikTok carousel slides.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title,
  description,
  openGraph: { title, description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
