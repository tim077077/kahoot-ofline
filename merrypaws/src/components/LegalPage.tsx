import Link from "next/link";
import { BRAND } from "@/lib/config";

// Shared frame for the privacy policy and the terms: plain, readable, and
// static so they also work from the app and in a static export.

export const LEGAL_UPDATED = "16 October 2026";
export const contactEmail = () => process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="paper min-h-[100dvh] px-5 pb-16 pt-[max(2rem,env(safe-area-inset-top))]">
      <article className="mx-auto max-w-2xl [&_h2]:font-display [&_h2]:mt-8 [&_h2]:text-xl [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          {BRAND}
        </Link>
        <h1 className="font-display mt-4 text-[2.2rem] leading-tight">{title}</h1>
        <p className="text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
        {children}
      </article>
    </main>
  );
}

export function Contact() {
  const email = contactEmail();
  return email ? <a href={`mailto:${email}`} className="underline underline-offset-4">{email}</a> : <>the email address on your receipt</>;
}
