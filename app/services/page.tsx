import type { Metadata } from "next";
import Link from "next/link";
import { LashEye } from "@/components/art";
import { ArrowForward, Check, Clock, Plus } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { ButtonLink, PageHero, SectionHeading } from "@/components/ui";
import { arDigits, extras, faqs, lashMaps, services, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "الخدمات والأسعار",
  description: "كلاسيك، هايبرد، فوليوم، ميغا فوليوم، ويت لوك ورفع الرموش: المدة والأسعار وخرائط الرموش والأسئلة الشائعة.",
};

const price = (n: number) => (
  <>
    <span className="font-display text-3xl">{arDigits(n)}</span> <span className="text-sm">{site.currency}</span>
  </>
);

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services & Prices"
        title="خدمات تُفصَّل على مقاس نظرتكِ"
        lead="الأسعار تشمل الاستشارة ورسم خريطة الرموش ودليل العناية. المدة تقريبية وتختلف بحسب كثافة رموشكِ الطبيعية."
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
      <nav aria-label="فهرس الخدمات" className="sticky top-[5.5rem] z-30 border-b border-cocoa/10 bg-cream/85 backdrop-blur-lg">
        <ul className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3 sm:px-8 [scrollbar-width:none]">
          {services.map((s) => (
            <li key={s.id} className="shrink-0">
              <a href={`#${s.id}`} className="flex min-h-11 items-center rounded-full border border-cocoa/15 px-4 text-sm text-cocoa transition-colors duration-200 hover:border-cocoa hover:bg-ivory">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Service rows */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl space-y-24 px-5 sm:space-y-32 sm:px-8">
          {services.map((s, i) => (
            <article key={s.id} id={s.id} className="grid scroll-mt-40 items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <Reveal variant="mask" className={i % 2 === 1 ? "lg:order-2" : ""}>
                <div className="arch relative mx-auto aspect-[5/6] max-w-md overflow-hidden border border-gold/25 bg-ink">
                  <div className="glow absolute inset-x-0 top-[12%] mx-auto aspect-square w-4/5 opacity-70" aria-hidden="true" />
                  <span className="font-display absolute inset-x-0 top-8 text-center text-sm tracking-[0.35em] text-gold/70" dir="ltr">
                    {s.latin.toUpperCase()}
                  </span>
                  <div className="absolute inset-0 grid place-items-center px-10 text-gold-soft">
                    <LashEye style={s.style} map={s.map} seed={i + 9} className="w-full" label={`رسم توضيحي لنمط ${s.name}`} />
                  </div>
                  {s.featured ? (
                    <span className="absolute inset-x-0 bottom-8 mx-auto w-fit rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-ink">الأكثر طلبًا</span>
                  ) : null}
                </div>
              </Reveal>

              <div>
                <Reveal as="p" className="font-display text-xl text-gold-deep italic">
                  <span dir="ltr">{s.latin}</span>
                </Reveal>
                <Reveal as="h2" delay={60} className="font-naskh mt-2 text-4xl text-cocoa sm:text-5xl">
                  {s.name}
                </Reveal>
                <Reveal as="p" delay={120} className="mt-5 max-w-lg text-lg leading-9 text-taupe">
                  {s.summary}
                </Reveal>
                <Reveal as="ul" delay={180} className="mt-7 space-y-3">
                  {s.details.map((d) => (
                    <li key={d} className="flex items-center gap-3 text-cocoa">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/20 text-gold-deep">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {d}
                    </li>
                  ))}
                </Reveal>
                <Reveal delay={240} className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-cocoa/10 pt-7">
                  <span className="flex items-center gap-2 text-taupe">
                    <Clock className="text-gold-deep" /> {s.duration}
                  </span>
                  <span className="text-cocoa">{price(s.price)}</span>
                  <Link href={`/booking?service=${s.id}`} className="btn btn-ink group ms-auto min-h-12 px-6">
                    احجزي {s.name}
                    <ArrowForward className="transition-transform duration-300 group-hover:-translate-x-1" />
                  </Link>
                </Reveal>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Extras */}
      <section className="bg-ivory py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <SectionHeading eyebrow="Care & Refills" title="التعبئة والعناية" lead="للحفاظ على كثافة رموشكِ مع دورة التساقط الطبيعية." />
          <ul className="mt-12 divide-y divide-cocoa/10 border-y border-cocoa/10">
            {extras.map((e, i) => (
              <Reveal as="li" key={e.name} delay={i * 80} className="flex flex-wrap items-center justify-between gap-4 py-6">
                <span>
                  <span className="block text-xl text-cocoa">{e.name}</span>
                  <span className="block text-sm text-taupe">{e.note}</span>
                </span>
                <span className="text-cocoa">{price(e.price)}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Lash maps */}
      <section className="relative overflow-hidden bg-ink py-24 text-ivory sm:py-32">
        <div className="glow pointer-events-none absolute -top-40 right-1/3 h-[30rem] w-[30rem] opacity-40" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeading
            tone="light"
            eyebrow="Lash Mapping"
            title="خريطة الرموش: سرّ النظرة"
            lead="الخريطة تحدد أين تطول الرموش وأين تقصر. نختارها معًا بحسب شكل عينكِ والإطلالة التي تريدينها."
          />
          <ul className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {lashMaps.map((m, i) => (
              <Reveal as="li" key={m.id} delay={i * 100} className="rounded-[1.75rem] border border-gold/20 bg-ink-2 p-6 transition-colors duration-300 hover:border-gold/50">
                <div className="text-gold-soft">
                  <LashEye style="classic" map={m.id} seed={i + 1} className="w-full" label={`خريطة ${m.name}`} />
                </div>
                <h3 className="font-naskh mt-4 text-2xl">{m.name}</h3>
                <p className="font-display text-gold-soft/80 italic" dir="ltr">
                  {m.latin}
                </p>
                <p className="mt-3 text-sm leading-7 text-ivory/70">{m.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <SectionHeading eyebrow="FAQ" title="أسئلة تصلنا كثيرًا" lead="لم تجدي إجابتكِ؟ راسلينا على واتساب وسنردّ عليكِ بكل سرور." />
            <Reveal delay={240} className="mt-8">
              <ButtonLink href="/booking" variant="ink">
                احجزي استشارة
              </ButtonLink>
            </Reveal>
          </div>
          <div className="divide-y divide-cocoa/10 border-y border-cocoa/10">
            {faqs.map((f, i) => (
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
