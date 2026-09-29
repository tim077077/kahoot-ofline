import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { StyleArt } from "@/components/StyleCard";
import { BRAND, formatUsd, PLAN_ORDER, PLANS } from "@/lib/config";
import { styleSamples } from "@/lib/samples";
import { STYLES } from "@/lib/styles";

const STEPS = [
  { title: "Upload your pet", text: "Any clear phone photo where you can see their face. Add a photo of yourself to be in it too." },
  { title: "Pick a Christmas look", text: "Fireplace, Santa hat, snowy forest, royal oil painting and more." },
  { title: "Preview free, then keep it", text: "See your pet's portrait before paying. Unlock the full-resolution image to print or share." },
];

const FAQ = [
  {
    q: "Is the preview really free?",
    a: "Yes. You get a few free watermarked previews a day, no account or card needed. You only pay to unlock the full-resolution portrait.",
  },
  {
    q: "Will it actually look like my pet?",
    a: "That's the whole point, and the look is tuned to keep breed, colours and markings. Clear, well-lit photos of their face work best. If a preview misses, try another photo or look before paying.",
  },
  {
    q: "Can I print it?",
    a: "Yes. The unlocked portrait is a high-resolution image you can print as a card, a poster or on a mug.",
  },
  {
    q: "What happens to my photos?",
    a: "They are only used to create your portrait. Portraits are deleted automatically after 30 days, so download yours once you unlock it.",
  },
  {
    q: "Something went wrong with my order",
    a: "Email us and we'll make it right, including a refund if we can't.",
  },
];

export default function Home() {
  const samples = styleSamples();
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const cheapest = PLANS.family.price / PLANS.family.credits;

  return (
    <>
      <SiteHeader
        right={
          <Link href="/create" className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink">
            Make a portrait
          </Link>
        }
      />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-pine">🎄 The Christmas gift that makes people cry (the good kind)</p>
            <h1 className="font-display text-4xl font-semibold leading-tight md:text-6xl">
              Your pet&apos;s Christmas portrait, in about a minute.
            </h1>
            <p className="mt-5 text-lg text-muted">
              Upload a photo, pick a festive look and see the result before you pay. Perfect for cards, frames and
              gifts.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/create" className="rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-accent-ink shadow-sm">
                Try it free
              </Link>
              <span className="text-sm text-muted">Free preview. No account, no card.</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {STYLES.slice(0, 4).map((s, i) => (
              <div key={s.id} className={`self-start overflow-hidden rounded-2xl border border-line shadow-sm ${i % 2 ? "mt-6" : ""}`}>
                <StyleArt style={s} sample={samples[s.id]} />
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="font-display text-3xl font-semibold">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-2xl border border-line bg-paper p-6">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pine text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl font-semibold">Eight festive looks</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {STYLES.map((s) => (
              <Link key={s.id} href={`/create?style=${s.id}`} className="group overflow-hidden rounded-2xl border border-line bg-card">
                <StyleArt style={s} sample={samples[s.id]} />
                <div className="p-3">
                  <p className="font-semibold group-hover:text-accent">{s.name}</p>
                  <p className="text-sm text-muted">{s.blurb}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-y border-line bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="font-display text-3xl font-semibold">Pay only for the ones you love</h2>
            <p className="mt-2 text-muted">Previews are free. Unlocking a portrait uses one credit. Down to {formatUsd(Math.round(cheapest))} a portrait.</p>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {PLAN_ORDER.map((id) => {
                const plan = PLANS[id];
                const popular = id === "trio";
                return (
                  <div
                    key={id}
                    className={`relative flex flex-col rounded-2xl border bg-paper p-6 ${popular ? "border-accent ring-2 ring-accent" : "border-line"}`}
                  >
                    {popular && (
                      <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-ink">
                        Most popular
                      </span>
                    )}
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted">{plan.blurb}</p>
                    <p className="mt-4 text-3xl font-bold">{formatUsd(plan.price)}</p>
                    <p className="text-sm text-muted">{formatUsd(Math.round(plan.price / plan.credits))} per portrait</p>
                    <Link
                      href="/create"
                      className={`mt-6 rounded-xl px-4 py-3 text-center font-semibold ${popular ? "bg-accent text-accent-ink" : "border border-ink/15 bg-card"}`}
                    >
                      Start with a free preview
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="font-display text-3xl font-semibold">Questions</h2>
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
          <div className="mt-10 text-center">
            <Link href="/create" className="rounded-xl bg-accent px-6 py-3.5 font-semibold text-accent-ink">
              Make your pet&apos;s portrait
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 text-sm text-muted">
          <span>© {new Date().getFullYear()} {BRAND}</span>
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
