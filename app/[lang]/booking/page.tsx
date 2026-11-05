import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { Clock, Instagram, Pin, Sparkle, WhatsApp } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { PageHero } from "@/components/ui";
import { isLocale } from "@/lib/i18n/config";
import { num } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { services, site, whatsappLink } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/booking">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang).booking;
  return { title: d.metaTitle, description: d.metaDesc };
}

export default async function BookingPage({ params, searchParams }: PageProps<"/[lang]/booking">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const d = dict.booking;
  const requested = (await searchParams).service;
  const defaultService = typeof requested === "string" && services.some((s) => s.id === requested) ? requested : undefined;

  return (
    <>
      <PageHero eyebrow="Reservations" title={d.title} lead={d.lead} />

      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
          <Reveal>
            <BookingForm defaultService={defaultService} />
          </Reveal>

          <aside className="space-y-6" aria-label={d.aside}>
            <Reveal delay={100} className="relative overflow-hidden rounded-[2rem] bg-ink p-8 text-ivory">
              <div className="glow pointer-events-none absolute -top-20 -left-20 h-64 w-64 opacity-60" aria-hidden="true" />
              <p className="relative flex items-center gap-2 text-sm text-gold-soft">
                <Sparkle className="h-3 w-3" /> {dict.announcement.label}
              </p>
              <p className="font-display relative mt-3 text-3xl leading-snug">{dict.announcement.headline}</p>
              <p className="relative mt-3 text-sm text-ivory/70">
                {d.offerHint}{" "}
                <span className="font-display lining tracking-[0.2em] text-gold-soft" dir="ltr">
                  {site.offerCode}
                </span>
              </p>
            </Reveal>

            <Reveal delay={160} className="rounded-[2rem] border border-cocoa/10 bg-ivory p-8">
              <h2 className="font-naskh text-2xl text-cocoa">{d.visitTitle}</h2>
              <ul className="mt-6 space-y-5 text-cocoa">
                <li className="flex gap-3">
                  <Pin className="mt-1 shrink-0 text-gold-deep" />
                  {dict.footer.location}
                </li>
                {dict.footer.hours.map((h) => (
                  <li key={h.days} className="flex gap-3">
                    <Clock className="mt-1 shrink-0 text-gold-deep" />
                    <span>
                      <span className="block">{h.days}</span>
                      <span className="text-taupe">{h.time}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-ink min-h-11 px-5 text-sm">
                  <WhatsApp className="h-5 w-5" /> {dict.common.whatsapp}
                </a>
                <a href={`https://instagram.com/${site.instagram}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-dark min-h-11 px-5 text-sm">
                  <Instagram className="h-5 w-5" /> {dict.common.instagram}
                </a>
              </div>
            </Reveal>

            <Reveal delay={220} className="rounded-[2rem] border border-cocoa/10 p-8">
              <h2 className="font-naskh text-2xl text-cocoa">{d.tipsTitle}</h2>
              <ol className="mt-6 space-y-4">
                {d.tips.map((tip, i) => (
                  <li key={tip} className="flex gap-4 text-taupe">
                    <span className="font-display text-xl text-gold-deep">{num(i + 1, lang)}</span>
                    <span className="leading-7">{tip}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  );
}
