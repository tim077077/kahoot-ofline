import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { TemplateGallery } from "@/components/TemplateGallery";
import { BRAND, formatUsd, LIMITS, PRO } from "@/lib/config";
import { LIBRARY_UPDATED } from "@/lib/templates";

const FAQ = [
  {
    q: "Where do the templates come from?",
    a: "They're slideshow formats that keep going viral on TikTok, picked and ranked by hand and updated regularly. Each one explains why it works.",
  },
  {
    q: "Does it post to TikTok for me?",
    a: "Today you download the slides and upload them as a photo post, which takes about 30 seconds. Sending straight to your TikTok drafts through TikTok's official API is on the way.",
  },
  {
    q: "Can I promote my own app or product?",
    a: "Yes. Add it in “feature a product” and the AI works it into the slideshow naturally, using only what you tell it.",
  },
  {
    q: "Can I cancel Pro?",
    a: "Any time. It simply stops renewing at the end of the month.",
  },
];

export default function Home() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <>
      <SiteHeader
        right={
          <Link href="/editor" className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink">
            Make a slideshow
          </Link>
        }
      />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-8 pt-14 text-center md:pt-20">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-accent">For creators, faceless pages and app founders</p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Viral TikTok slideshows in about a minute.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            Pick a format that&apos;s already proven to go viral, type your topic, and get ready-to-post 1080×1920 slides.
            AI writes the hook and every slide.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/editor" className="rounded-xl bg-accent px-6 py-3.5 font-semibold text-accent-ink shadow-sm">
              Try it free
            </Link>
            <span className="text-sm text-muted">{LIMITS.freePerIpPerDay} free AI slideshows a day. No account.</span>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Formats working right now</h2>
            <p className="text-sm text-muted">Curated by hand · updated {LIBRARY_UPDATED}</p>
          </div>
          <TemplateGallery />
        </section>

        <section id="pricing" className="border-y border-line bg-card">
          <div className="mx-auto grid max-w-4xl gap-6 px-4 py-14 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-paper p-6">
              <h3 className="text-lg font-bold">Free</h3>
              <p className="mt-2 text-3xl font-extrabold">$0</p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li>✓ Every template</li>
                <li>✓ {LIMITS.freePerIpPerDay} AI-written slideshows a day</li>
                <li>✓ Unlimited manual editing and downloads</li>
                <li>· Small “made with {BRAND}” on the last slide</li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-accent bg-paper p-6">
              <h3 className="text-lg font-bold">Pro</h3>
              <p className="mt-2 text-3xl font-extrabold">
                {formatUsd(PRO.price)}
                <span className="text-base font-normal text-muted"> / month</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li>✓ Up to {PRO.aiPerDay} AI slideshows a day</li>
                <li>✓ No watermark</li>
                <li>✓ New formats as soon as they trend</li>
              </ul>
              <Link href="/editor?upgrade=1" className="mt-6 block rounded-xl bg-accent px-4 py-3 text-center font-semibold text-accent-ink">
                Go Pro
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-3xl font-extrabold tracking-tight">Questions</h2>
          <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
            {FAQ.map((item) => (
              <details key={item.q} className="group p-5">
                <summary className="cursor-pointer list-none font-semibold">
                  <span className="mr-2 inline-block text-accent transition group-open:rotate-45">+</span>
                  {item.q}
                </summary>
                <p className="mt-2 text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 text-sm text-muted">
          <span>© {new Date().getFullYear()} {BRAND}. Not affiliated with TikTok.</span>
          {contact && (
            <a href={`mailto:${contact}`} className="ml-auto hover:text-ink">
              Contact: {contact}
            </a>
          )}
        </div>
      </footer>
    </>
  );
}
