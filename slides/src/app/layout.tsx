import type { Metadata } from "next";
import { Caveat, Courier_Prime, Fraunces, Montserrat } from "next/font/google";
import { BRAND } from "@/lib/config";
import "./globals.css";

// These fonts are also used to draw slides on canvas, one per SlideStyle font.
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["600"] });
const courier = Courier_Prime({ variable: "--font-courier", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: `${BRAND} — slideshow studio`,
  description: "Copy the format of any viral TikTok slideshow from a screenshot and make your own.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${fraunces.variable} ${caveat.variable} ${courier.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
