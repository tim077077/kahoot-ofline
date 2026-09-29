import Link from "next/link";
import { notFound } from "next/navigation";
import { BeforeAfter } from "@/components/BeforeAfter";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND, currencyFor, formatPrice, isLocale, PLANS, type PlanId } from "@/lib/config";
import { getDictionary } from "@/lib/i18n";

const PLAN_ORDER: PlanId[] = ["starter", "agent", "pro"];

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const currency = currencyFor(lang);
  const studio = `/${lang}/studio`;
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <>
      <SiteHeader
        lang={lang}
        switchHref={lang === "ro" ? "/en" : "/ro"}
        right={
          <>
            <a href="#pricing" className="hidden text-sm text-muted hover:text-ink sm:inline">
              {t.nav.pricing}
            </a>
            <a href="#faq" className="hidden text-sm text-muted hover:text-ink sm:inline">
              {t.nav.faq}
            </a>
            <Link href={studio} className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink">
              {t.nav.tryFree}
            </Link>
          </>
        }
      />

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-accent">{t.hero.kicker}</p>
            <h1 className="font-display text-4xl font-semibold leading-tight md:text-5xl">{t.hero.title}</h1>
            <p className="mt-5 text-lg text-muted">{t.hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href={studio} className="rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-accent-ink shadow-sm">
                {t.hero.cta}
              </Link>
              <span className="text-sm text-muted">{t.hero.note}</span>
            </div>
          </div>
          <figure>
            <BeforeAfter
              before="/demo/before.svg"
              after="/demo/after.svg"
              beforeLabel={t.hero.before}
              afterLabel={t.hero.after}
            />
            <figcaption className="mt-2 text-center text-xs text-muted">{t.hero.illustration}</figcaption>
          </figure>
        </section>

        <section className="border-y border-line bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="font-display text-3xl font-semibold">{t.how.title}</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {t.how.steps.map((step, i) => (
                <li key={step.title} className="rounded-2xl border border-line bg-paper p-6">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink">
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
          <h2 className="font-display text-3xl font-semibold">{t.uses.title}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {t.uses.items.map((item) => (
              <div key={item.title} className="rounded-2xl border border-line bg-card p-6">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-y border-line bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="font-display text-3xl font-semibold">{t.pricing.title}</h2>
            <p className="mt-2 max-w-2xl text-muted">{t.pricing.subtitle}</p>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {PLAN_ORDER.map((id) => {
                const plan = PLANS[id];
                const amount = plan.price[currency];
                const popular = id === "agent";
                return (
                  <div
                    key={id}
                    className={`relative flex flex-col rounded-2xl border bg-paper p-6 ${popular ? "border-accent ring-2 ring-accent" : "border-line"}`}
                  >
                    {popular && (
                      <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-ink">
                        {t.pricing.popular}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold">{t.pricing.plans[id].name}</h3>
                    <p className="text-sm text-muted">{t.pricing.plans[id].desc}</p>
                    <p className="mt-4 text-3xl font-bold">
                      {formatPrice(amount, currency)}
                      {plan.mode === "subscription" && (
                        <span className="text-base font-normal text-muted"> {t.pricing.perMonth}</span>
                      )}
                    </p>
                    <p className="text-sm text-muted">
                      {formatPrice(Math.round(amount / plan.credits), currency)} {t.pricing.perImage}
                    </p>
                    <Link
                      href={`${studio}?buy=${id}`}
                      className={`mt-6 rounded-xl px-4 py-3 text-center font-semibold ${popular ? "bg-accent text-accent-ink" : "border border-ink/15 bg-card"}`}
                    >
                      {plan.mode === "subscription" ? t.pricing.subscribe : t.pricing.buy}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="font-display text-3xl font-semibold">{t.faq.title}</h2>
          <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
            {t.faq.items.map((item) => (
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
            <Link href={studio} className="rounded-xl bg-accent px-6 py-3.5 font-semibold text-accent-ink">
              {t.hero.cta}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 text-sm text-muted">
          <span>
            © {new Date().getFullYear()} {BRAND}. {t.footer.rights}
          </span>
          {contact && (
            <a href={`mailto:${contact}`} className="ml-auto hover:text-ink">
              {t.footer.contact}: {contact}
            </a>
          )}
        </div>
      </footer>
    </>
  );
}
