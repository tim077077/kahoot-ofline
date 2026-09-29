import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { BRAND, siteUrl } from "@/lib/config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

const title = `${BRAND} — Christmas portraits of your pet`;
const description =
  "Upload a photo of your pet and get a heartwarming Christmas portrait in about a minute. Free preview, no account needed.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title,
  description,
  openGraph: { title, description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
