import Link from "next/link";
import type { CSSProperties } from "react";
import { LashDivider, LashEye, RotatingBadge } from "@/components/art";
import { BeforeAfter } from "@/components/before-after";
import { CountdownBlocks } from "@/components/countdown";
import { Counter } from "@/components/counter";
import { ArrowForward, Check, WhatsApp } from "@/components/icons";
import { LashDesigner } from "@/components/lash-designer";
import { Reveal } from "@/components/reveal";
import { ButtonLink, Marquee, SectionHeading } from "@/components/ui";
import { arDigits, facts, journey, pillars, services, site, whatsappLink } from "@/lib/site";

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

export default function Home() {
  const signature = services.slice(0, 4);

  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <section className="relative isolate overflow-hidden bg-ink text-ivory">
        <div className="glow pointer-events-none absolute -top-48 left-[-12%] -z-10 h-[42rem] w-[42rem] opacity-70" aria-hidden="true" />
        <div className="glow-rose pointer-events-none absolute right-[-10%] bottom-[-20%] -z-10 h-[30rem] w-[30rem] opacity-25" aria-hidden="true" />
        <p
          className="font-display parallax pointer-events-none absolute -bottom-[0.18em] left-0 -z-10 text-[34vw] leading-none text-transparent italic select-none [-webkit-text-stroke:1px_rgba(201,164,92,0.13)] lg:text-[26rem]"
          dir="ltr"
          aria-hidden="true"
        >
          Serag
        </p>

        <div className="mx-auto grid min-h-[100svh] max-w-7xl items-center gap-16 px-5 pt-36 pb-24 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-32">
          <div>
            <p className="eyebrow fade-in flex items-center gap-3 text-gold">
              <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
              <span dir="ltr">Luxury Lash Studio</span>
            </p>

            <h1 className="rise font-display mt-8 text-[3.5rem] leading-[1.3] sm:text-7xl lg:text-[6.4rem] lg:leading-[1.2]">
              <span className="w">
                <span style={v({ "--i": 0 })}>رموشٌ</span>
              </span>{" "}
              <span className="w">
                <span style={v({ "--i": 1 })} className="font-script text-gold-grad">
                  تُضيء
                </span>
              </span>
              <br />
              <span className="w">
                <span style={v({ "--i": 2 })}>نظرتكِ</span>
              </span>
            </h1>

            <p className="fade-in mt-8 max-w-lg text-lg leading-9 text-ivory/75" style={v({ "--d": "650ms" })}>
              في سراج لاشز لا نُركّب رموشًا جاهزة. نرسم لعينيكِ خريطةً خاصة، ونختار لكل رمشة طولها ووزنها، لتبدو نظرتكِ كأنها
              وُلدت هكذا.
            </p>

            <div className="fade-in mt-10 flex flex-wrap gap-3" style={v({ "--d": "850ms" })}>
              <ButtonLink href="/booking">احجزي موعدك</ButtonLink>
              <ButtonLink href="/services" variant="ghost-light" arrow={false}>
                الخدمات والأسعار
              </ButtonLink>
            </div>

            <ul className="fade-in mt-12 flex flex-wrap gap-x-7 gap-y-3 text-sm text-ivory/70" style={v({ "--d": "1050ms" })}>
              {["خريطة رموش على مقاسكِ", "مواد آمنة للعين", "أدوات معقّمة لكل جلسة"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="text-gold" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero art */}
          <div className="relative mx-auto w-full max-w-[22rem] sm:max-w-[27rem] lg:max-w-[30rem]">
            <div className="ring-orbit spin-slow absolute top-[-8%] left-1/2 aspect-square w-[128%] -translate-x-1/2" aria-hidden="true">
              <span className="absolute top-1/2 -left-1 h-2 w-2 rounded-full bg-gold" />
            </div>
            <div className="ring-orbit absolute top-[2%] left-1/2 aspect-square w-[108%] -translate-x-1/2 opacity-60" aria-hidden="true" />

            <div className="arch fade-in relative aspect-[4/5] overflow-hidden border border-gold/30 bg-gradient-to-b from-ink-3 via-ink-2 to-ink" style={v({ "--d": "200ms" })}>
              <div className="glow absolute inset-x-0 top-[12%] mx-auto aspect-square w-[85%]" aria-hidden="true" />
              <div className="absolute inset-0 grid place-items-center px-8 text-gold-soft sm:px-10">
                <LashEye style="volume" map="cat" seed={11} draw baseDelay={700} className="w-full drop-shadow-[0_0_18px_rgba(230,209,160,0.25)]" label="رسم لعين مغمضة برموش فوليوم بخريطة عين القطة" />
              </div>
              <p className="eyebrow absolute inset-x-0 bottom-8 text-center text-gold/75" dir="ltr">
                Volume · Cat Eye
              </p>
            </div>

            <RotatingBadge className="absolute -top-2 -left-3 h-24 w-24 sm:-left-8 sm:h-28 sm:w-28" />

            <div className="float-slow absolute -right-3 -bottom-16 sm:-right-10 sm:-bottom-14">
              <div className="fade-in flex items-center gap-4 rounded-2xl bg-ivory/95 p-3 pe-5 text-cocoa shadow-[0_25px_60px_-25px_rgba(0,0,0,0.7)] backdrop-blur" style={v({ "--d": "1300ms" })}>
                <span className="grid h-14 w-16 place-items-center rounded-xl bg-ink text-gold-soft">
                  <LashEye style="hybrid" map="squirrel" showCrease={false} lidWidth={4} className="w-14" />
                </span>
                <span className="leading-tight">
                  <span className="block text-xs text-taupe">الأكثر طلبًا</span>
                  <span className="mt-1 block font-semibold">هايبرد · السنجاب</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <a href="#manifesto" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-ivory/60 transition-colors hover:text-gold-soft md:flex">
          <span>اكتشفي</span>
          <span className="h-10 w-px bg-gradient-to-b from-gold to-transparent" aria-hidden="true" />
        </a>
      </section>

      {/* ───────────── Marquee ───────────── */}
      <section aria-label="أنماط الرموش" className="border-y border-gold/15 bg-ink-2 py-6 text-ivory">
        <Marquee
          className="font-display text-2xl sm:text-3xl"
          items={["Classic · كلاسيك", "Hybrid · هايبرد", "Volume · فوليوم", "Mega Volume · ميغا", "Wet Look · ويت لوك", "Lash Lift · رفع الرموش", "Lash Mapping · خريطة الرموش"]}
        />
      </section>

      {/* ───────────── Manifesto ───────────── */}
      <section id="manifesto" className="relative scroll-mt-24 overflow-hidden py-28 sm:py-36">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[14rem_1fr]">
            <Reveal as="p" className="eyebrow flex items-center gap-3 text-gold-deep lg:flex-col lg:items-start">
              <span dir="ltr">The Serag Way</span>
              <span className="h-px w-10 bg-current opacity-60 lg:h-16 lg:w-px" aria-hidden="true" />
            </Reveal>
            <Reveal as="h2" className="font-naskh text-3xl leading-[1.75] text-cocoa sm:text-[2.75rem] sm:leading-[1.7]">
              الرموش ليست زينةً تُضاف، بل <em className="font-script text-gold-deep not-italic">إطارٌ</em> يُضيء النظرة. لذلك نبدأ
              من عينيكِ أنتِ: شكلها، ونبرة إطلالتكِ، وإيقاع يومكِ، ثم نرسم ما يليق بكِ{" "}
              <span className="relative whitespace-nowrap">
                وحدكِ
                <LashDivider className="absolute -bottom-3 left-1/2 w-28 -translate-x-1/2 text-gold" />
              </span>
              .
            </Reveal>
          </div>

          <ol className="mt-24 grid gap-px overflow-hidden rounded-[2rem] bg-cocoa/10 md:grid-cols-3">
            {pillars.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 120} className="bg-cream p-8 sm:p-10">
                <span className="font-display text-5xl text-gold-deep/70" aria-hidden="true">
                  {arDigits(`0${i + 1}`)}
                </span>
                <h3 className="mt-6 text-xl font-semibold text-cocoa">{p.title}</h3>
                <p className="mt-3 leading-8 text-taupe">{p.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Signature styles ───────────── */}
      <section className="relative bg-sand/60 py-28 sm:py-36">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Signature Styles"
              title={
                <>
                  أربعة أنماط، <span className="text-gold-deep">ألف</span> طريقة لارتدائها
                </>
              }
              lead="كل نمط يُفصَّل على خريطة عينكِ: الطول والانحناء والكثافة تتغير من امرأة لأخرى."
            />
            <Reveal delay={200}>
              <Link href="/services" className="group inline-flex min-h-11 items-center gap-2 font-semibold text-cocoa">
                <span className="link-line">كل الخدمات والأسعار</span>
                <ArrowForward className="transition-transform duration-300 group-hover:-translate-x-1" />
              </Link>
            </Reveal>
          </div>

          <ul className="mt-16 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {signature.map((s, i) => (
              <Reveal as="li" key={s.id} delay={i * 110} className={i % 2 === 1 ? "lg:mt-14" : ""}>
                <Link href={`/services#${s.id}`} className="group block">
                  <div className="arch relative aspect-[3/4] overflow-hidden border border-gold/20 bg-ink transition-[border-color,transform] duration-500 group-hover:-translate-y-1.5 group-hover:border-gold/70">
                    <div className="glow absolute inset-x-0 top-[14%] mx-auto aspect-square w-3/4 opacity-50 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
                    <span className="font-display absolute inset-x-0 top-7 text-center text-sm tracking-[0.3em] text-gold/70" aria-hidden="true">
                      {arDigits(`0${i + 1}`)}
                    </span>
                    <div className="absolute inset-0 grid place-items-center px-6 text-gold-soft">
                      <LashEye style={s.style} map={s.map} seed={i + 5} className="w-full transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-[1.06]" />
                    </div>
                    {s.featured ? (
                      <span className="absolute inset-x-0 bottom-6 mx-auto w-fit rounded-full bg-gold px-3 py-1 text-xs font-semibold text-ink">
                        الأكثر طلبًا
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-6 flex items-baseline justify-between gap-3">
                    <h3 className="font-naskh text-2xl text-cocoa">{s.name}</h3>
                    <span className="font-display text-lg text-gold-deep italic" dir="ltr">
                      {s.latin}
                    </span>
                  </div>
                  <p className="mt-2 text-[0.95rem] leading-7 text-taupe">{s.summary}</p>
                  <p className="mt-4 flex items-center justify-between border-t border-cocoa/10 pt-4 text-sm text-cocoa">
                    <span>{s.duration}</span>
                    <span>
                      من <span className="font-display text-xl">{arDigits(s.price)}</span> {site.currency}
                    </span>
                  </p>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── Design your look ───────────── */}
      <section className="relative overflow-hidden bg-ink py-28 text-ivory sm:py-36">
        <div className="glow pointer-events-none absolute top-1/3 -right-40 h-[34rem] w-[34rem] opacity-40" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeading
            tone="light"
            eyebrow="Design Your Look"
            title={
              <>
                صمّمي نظرتكِ <span className="font-script text-gold-grad">قبل</span> أن تصلي
              </>
            }
            lead="اختاري النمط وخريطة الرموش، وشاهدي كيف تتغير النظرة. سنكمل التفاصيل معًا في الاستشارة."
          />
          <div className="mt-16">
            <LashDesigner />
          </div>
          <Reveal className="mt-14 flex flex-wrap gap-3">
            <ButtonLink href="/booking">احجزي هذه الإطلالة</ButtonLink>
            <ButtonLink href="/gallery" variant="ghost-light" arrow={false}>
              شاهدي المعرض
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      {/* ───────────── Journey ───────────── */}
      <section className="py-28 sm:py-36">
        <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeading
              eyebrow="Your Ritual"
              title="رحلتكِ معنا، خطوة بخطوة"
              lead="جلسة التركيب عندنا طقس هادئ: إضاءة ناعمة، سرير مريح، ووقت لكِ وحدكِ."
            />
            <Reveal delay={240} className="mt-10">
              <ButtonLink href="/about" variant="ghost-dark" arrow={false}>
                تعرّفي على الاستوديو
              </ButtonLink>
            </Reveal>
          </div>

          <ol className="relative">
            <span className="draw-y absolute top-2 right-[1.6rem] bottom-2 w-px bg-gradient-to-b from-gold via-gold/50 to-transparent" aria-hidden="true" />
            {journey.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 100} className="relative flex gap-8 pb-14 last:pb-0">
                <span className="font-display relative z-10 grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-full border border-gold/50 bg-cream text-xl text-gold-deep">
                  {arDigits(i + 1)}
                </span>
                <div className="pt-2">
                  <h3 className="font-naskh text-2xl text-cocoa">{step.title}</h3>
                  <p className="mt-2 max-w-md leading-8 text-taupe">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Facts ───────────── */}
      <section aria-label="أرقام" className="border-y border-cocoa/10 bg-ivory">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 lg:grid-cols-4">
          {facts.map((f, i) => (
            <Reveal key={f.label} delay={i * 90} className={`py-12 text-center sm:py-16 ${i > 0 ? "lg:border-s lg:border-cocoa/10" : ""} ${i % 2 === 1 ? "border-s border-cocoa/10 lg:border-s" : ""} ${i > 1 ? "border-t border-cocoa/10 lg:border-t-0" : ""}`}>
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="font-display block text-6xl text-gold-deep sm:text-7xl">
                  <Counter value={f.value} suffix={f.suffix} />
                </span>
                <span className="mt-3 block px-2 text-sm text-taupe">{f.label}</span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ───────────── Before / After ───────────── */}
      <section className="py-28 sm:py-36">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <SectionHeading align="center" eyebrow="Before · After" title="الفرق يُلاحظ من النظرة الأولى" lead="اسحبي الخط لتري كيف تتحول رموش خفيفة إلى نظرة ممتلئة بخريطة عين القطة." />
          <Reveal variant="mask" className="mt-14">
            <BeforeAfter />
          </Reveal>
        </div>
      </section>

      {/* ───────────── Offer ───────────── */}
      <section className="relative overflow-hidden bg-ink py-24 text-ivory sm:py-32">
        <div className="glow pointer-events-none absolute top-10 -left-24 h-[38rem] w-[38rem] opacity-40" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Reveal as="p" className="eyebrow flex items-center gap-3 text-gold">
              <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
              <span dir="ltr">First Visit Offer</span>
            </Reveal>
            <Reveal as="h2" delay={80} className="font-display mt-6 text-4xl leading-[1.35] sm:text-6xl sm:leading-[1.25]">
              زيارتكِ الأولى تستحق <span className="text-gold-grad">بداية خاصة</span>
            </Reveal>
            <Reveal as="p" delay={160} className="mt-6 max-w-lg text-lg text-ivory/75">
              {site.offer.headline}. {site.offer.note}:
            </Reveal>
            <Reveal delay={220} className="mt-5 inline-flex items-center gap-3 rounded-full border border-dashed border-gold/50 px-5 py-2.5">
              <span className="text-sm text-ivory/70">رمز العرض</span>
              <span className="font-display lining text-xl tracking-[0.25em] text-gold-soft" dir="ltr">
                {site.offer.code}
              </span>
            </Reveal>
            <Reveal delay={280} className="mt-10">
              <p className="mb-4 text-sm text-ivory/70">ينتهي العرض بنهاية الشهر الحالي</p>
              <CountdownBlocks />
            </Reveal>
            <Reveal delay={340} className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/booking">احجزي بالعرض</ButtonLink>
              <ButtonLink href={whatsappLink(`مرحبًا، أودّ الحجز بعرض الزيارة الأولى (${site.offer.code})`)} variant="ghost-light" arrow={false} external>
                <span className="flex items-center gap-2">
                  <WhatsApp className="h-5 w-5" /> عبر واتساب
                </span>
              </ButtonLink>
            </Reveal>
          </div>

          <Reveal variant="mask" className="relative mx-auto w-full max-w-sm">
            <div className="arch relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-gold-soft via-gold to-gold-deep p-px">
              <div className="arch relative h-full w-full overflow-hidden bg-ink-2">
                <div className="glow absolute inset-x-0 top-10 mx-auto aspect-square w-4/5" aria-hidden="true" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-display lining text-gold-grad text-[7.5rem] leading-none sm:text-[9rem]" dir="ltr">
                    20%
                  </span>
                  <span className="mt-2 text-lg text-ivory/80">على أول جلسة تركيب</span>
                  <LashDivider className="mt-6 w-40 text-gold/80" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── Final CTA ───────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blush to-cream py-28 sm:py-36">
        <div className="arch pointer-events-none absolute -bottom-40 left-1/2 h-[34rem] w-[26rem] -translate-x-1/2 border border-rosewood/15" aria-hidden="true" />
        <div className="arch pointer-events-none absolute -bottom-40 left-1/2 h-[40rem] w-[34rem] -translate-x-1/2 border border-rosewood/10" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
          <Reveal className="mx-auto w-40 text-rosewood">
            <LashEye style="classic" map="doll" seed={4} showCrease={false} />
          </Reveal>
          <Reveal as="h2" delay={100} className="font-display mt-8 text-4xl leading-[1.35] text-cocoa sm:text-6xl sm:leading-[1.25]">
            مقعدكِ <span className="font-script text-rosewood">بانتظاركِ</span>
          </Reveal>
          <Reveal as="p" delay={180} className="mx-auto mt-6 max-w-xl text-lg text-taupe">
            المواعيد محدودة لأننا نمنح كل عميلة وقتها كاملًا. اختاري يومكِ ونتولى الباقي.
          </Reveal>
          <Reveal delay={260} className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/booking" variant="ink">
              احجزي موعدك الآن
            </ButtonLink>
            <ButtonLink href="/services" variant="ghost-dark" arrow={false}>
              تصفحي الأسعار
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}
