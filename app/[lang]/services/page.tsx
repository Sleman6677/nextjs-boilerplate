import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LashEye } from "@/components/art";
import { ArrowForward, Check, Clock, Plus } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { ButtonLink, PageHero, SectionHeading } from "@/components/ui";
import { href, isLocale } from "@/lib/i18n/config";
import { money, t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { extras, lashMapIds, services, site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/services">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang).services;
  return { title: d.metaTitle, description: d.metaDesc };
}

export default async function ServicesPage({ params }: PageProps<"/[lang]/services">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const d = dict.services;
  const price = (n: number) => (
    <span className="font-display text-3xl">{money(n, lang, site.currency)}</span>
  );

  return (
    <>
      <PageHero
        eyebrow="Services & Prices"
        title={d.title}
        lead={d.lead}
        art={
          <div className="arch relative mx-auto aspect-[4/5] w-80 overflow-hidden border border-gold/30 bg-gradient-to-b from-ink-3 to-ink">
            <div className="glow mx-auto mt-10 aspect-square w-4/5" aria-hidden="true" />
            <div className="absolute inset-0 grid place-items-center px-8 text-gold-soft">
              <LashEye style="mega" map="doll" draw baseDelay={500} className="w-full" />
            </div>
          </div>
        }
      />

      {/* Quick index */}
      <nav aria-label={d.index} className="sticky top-[5.5rem] z-30 border-b border-cocoa/10 bg-cream/85 backdrop-blur-lg">
        <ul className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3 sm:px-8 [scrollbar-width:none]">
          {services.map((s) => (
            <li key={s.id} className="shrink-0">
              <a href={`#${s.id}`} className="flex min-h-11 items-center rounded-full border border-cocoa/15 px-4 text-sm text-cocoa transition-colors duration-200 hover:border-cocoa hover:bg-ivory">
                {d.items[s.id].name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Service rows */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl space-y-24 px-5 sm:space-y-32 sm:px-8">
          {services.map((s, i) => {
            const item = d.items[s.id];
            return (
              <article key={s.id} id={s.id} className="grid scroll-mt-40 items-center gap-10 lg:grid-cols-2 lg:gap-20">
                <Reveal variant="mask" className={i % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="arch relative mx-auto aspect-[5/6] max-w-md overflow-hidden border border-gold/25 bg-ink">
                    <div className="glow absolute inset-x-0 top-[12%] mx-auto aspect-square w-4/5 opacity-70" aria-hidden="true" />
                    <span className="font-display absolute inset-x-0 top-8 text-center text-sm tracking-[0.35em] text-gold/70" dir="ltr">
                      {s.latin.toUpperCase()}
                    </span>
                    <div className="absolute inset-0 grid place-items-center px-10 text-gold-soft">
                      <LashEye style={s.style} map={s.map} seed={i + 9} className="w-full" label={t(d.illustration, { name: item.name })} />
                    </div>
                    {s.featured ? (
                      <span className="absolute inset-x-0 bottom-8 mx-auto w-fit rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-ink">{dict.common.mostRequested}</span>
                    ) : null}
                  </div>
                </Reveal>

                <div>
                  {item.name !== s.latin ? (
                    <Reveal as="p" className="font-display text-xl text-gold-deep italic">
                      <span dir="ltr">{s.latin}</span>
                    </Reveal>
                  ) : null}
                  <Reveal as="h2" delay={60} className="font-naskh mt-2 text-4xl text-cocoa sm:text-5xl">
                    {item.name}
                  </Reveal>
                  <Reveal as="p" delay={120} className="mt-5 max-w-lg text-lg leading-9 text-taupe">
                    {item.summary}
                  </Reveal>
                  <Reveal as="ul" delay={180} className="mt-7 space-y-3">
                    {item.details.map((detail) => (
                      <li key={detail} className="flex items-center gap-3 text-cocoa">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/20 text-gold-deep">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {detail}
                      </li>
                    ))}
                  </Reveal>
                  <Reveal delay={240} className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-cocoa/10 pt-7">
                    <span className="flex items-center gap-2 text-taupe">
                      <Clock className="text-gold-deep" /> {item.duration}
                    </span>
                    <span className="text-cocoa">{price(s.price)}</span>
                    <Link href={href(lang, `/booking?service=${s.id}`)} className="btn btn-ink group ms-auto min-h-12 px-6">
                      {t(d.book, { name: item.name })}
                      <ArrowForward className="transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                    </Link>
                  </Reveal>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Extras */}
      <section className="bg-ivory py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <SectionHeading eyebrow="Care & Refills" title={d.extrasTitle} lead={d.extrasLead} />
          <ul className="mt-12 divide-y divide-cocoa/10 border-y border-cocoa/10">
            {extras.map((e, i) => (
              <Reveal as="li" key={e.id} delay={i * 80} className="flex flex-wrap items-center justify-between gap-4 py-6">
                <span>
                  <span className="block text-xl text-cocoa">{d.extras[e.id].name}</span>
                  <span className="block text-sm text-taupe">{d.extras[e.id].note}</span>
                </span>
                <span className="text-cocoa">{price(e.price)}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Lash maps */}
      <section className="relative overflow-clip bg-ink py-24 text-ivory sm:py-32">
        <div className="glow pointer-events-none absolute -top-40 right-1/3 h-[30rem] w-[30rem] opacity-40" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeading tone="light" eyebrow="Lash Mapping" title={d.mapsTitle} lead={d.mapsLead} />
          <ul className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {lashMapIds.map((m, i) => {
              const map = dict.maps[m.id];
              return (
                <Reveal as="li" key={m.id} delay={i * 100} className="rounded-[1.75rem] border border-gold/20 bg-ink-2 p-6 transition-colors duration-300 hover:border-gold/50">
                  <div className="text-gold-soft">
                    <LashEye style="classic" map={m.id} seed={i + 1} className="w-full" label={t(d.mapLabel, { name: map.name })} />
                  </div>
                  <h3 className="font-naskh mt-4 text-2xl">{map.name}</h3>
                  {map.name !== m.latin ? (
                    <p className="font-display text-gold-soft/80 italic" dir="ltr">
                      {m.latin}
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm leading-7 text-ivory/70">{map.text}</p>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <SectionHeading eyebrow="FAQ" title={d.faqTitle} lead={d.faqLead} />
            <Reveal delay={240} className="mt-8">
              <ButtonLink href={href(lang, "/booking")} variant="ink">
                {d.faqCta}
              </ButtonLink>
            </Reveal>
          </div>
          <div className="divide-y divide-cocoa/10 border-y border-cocoa/10">
            {d.faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <details className="group py-2" name="faq">
                  <summary className="flex min-h-16 items-center justify-between gap-6 py-4 text-lg text-cocoa transition-colors duration-200 hover:text-gold-deep">
                    {f.q}
                    <span className="faq-icon grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cocoa/15">
                      <Plus className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="pb-6 leading-8 text-taupe">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
