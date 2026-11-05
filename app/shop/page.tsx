import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { LashDivider } from "@/components/art";
import { Check, WhatsApp } from "@/components/icons";
import { LashPair } from "@/components/lash-box";
import { Reveal } from "@/components/reveal";
import { HeroBoxPlayer, ShopCatalog } from "@/components/shop-catalog";
import { ButtonLink, Marquee } from "@/components/ui";
import { applySteps, arDigits, shop, site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "متجر الرموش اليومية",
  description: `علب رموش يومية جاهزة من سراج لاشز بستة تصاميم، سعر العلبة ${shop.boxPrice} ${shop.currency}. اطلبي عبر واتساب.`,
};

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

export default function ShopPage() {
  return (
    <div className="bg-petal">
      {/* ───────────── Hero ───────────── */}
      <section className="relative isolate overflow-clip bg-gradient-to-b from-plum via-berry-deep to-berry text-ivory">
        <div className="glow-pink drift pointer-events-none absolute -top-32 right-[-10%] -z-10 h-[34rem] w-[34rem] opacity-60" aria-hidden="true" />
        <div className="glow-pink drift pointer-events-none absolute bottom-[-20%] left-[-12%] -z-10 h-[30rem] w-[30rem] opacity-40" style={v({ "--d": "-6s" })} aria-hidden="true" />
        <p
          className="font-display pointer-events-none absolute -bottom-[0.2em] right-0 -z-10 text-[30vw] leading-none text-transparent italic select-none [-webkit-text-stroke:1px_rgba(248,215,223,0.14)] lg:text-[22rem]"
          dir="ltr"
          aria-hidden="true"
        >
          Daily
        </p>

        <div className="mx-auto grid min-h-[100svh] max-w-7xl items-center gap-20 px-5 pt-40 pb-28 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pt-36">
          <div>
            <p className="eyebrow fade-in flex items-center gap-3 text-pink">
              <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
              <span dir="ltr">Daily Lash Collection</span>
            </p>
            <h1 className="rise font-display mt-8 text-[3.2rem] leading-[1.3] sm:text-7xl lg:text-[5.6rem] lg:leading-[1.2]">
              <span className="w">
                <span style={v({ "--i": 0 })}>رموشكِ</span>
              </span>{" "}
              <span className="w">
                <span style={v({ "--i": 1 })}>اليومية،</span>
              </span>
              <br />
              <span className="w">
                <span style={v({ "--i": 2 })} className="font-script text-pink-grad">
                  جاهزة
                </span>
              </span>{" "}
              <span className="w">
                <span style={v({ "--i": 3 })}>في علبة</span>
              </span>
            </h1>
            <p className="fade-in mt-8 max-w-lg text-lg leading-9 text-ivory/80" style={v({ "--d": "700ms" })}>
              ستة تصاميم مستوحاة من خرائط الرموش التي نرسمها في الاستوديو، لتضعيها بنفسكِ في دقائق وتنزعيها متى شئتِ.
            </p>

            <div className="fade-in mt-9 flex flex-wrap items-center gap-x-6 gap-y-3" style={v({ "--d": "850ms" })}>
              <span className="font-display text-5xl text-pink-grad">
                {arDigits(shop.boxPrice)} {shop.currency}
              </span>
              <span className="text-ivory/70">للعلبة الواحدة · كل التصاميم بالسعر نفسه</span>
            </div>

            <div className="fade-in mt-10 flex flex-wrap gap-3" style={v({ "--d": "1000ms" })}>
              <a href="#collection" className="btn btn-pink group">
                تسوّقي التصاميم
              </a>
              <ButtonLink href={whatsappLink(`مرحبًا ${site.nameAr}، أودّ الاستفسار عن الرموش اليومية`)} variant="ghost-light" arrow={false} external>
                <span className="flex items-center gap-2">
                  <WhatsApp className="h-5 w-5" /> استفسري عبر واتساب
                </span>
              </ButtonLink>
            </div>
          </div>

          <div className="px-8 sm:px-12">
            <HeroBoxPlayer />
          </div>
        </div>
      </section>

      {/* ───────────── Marquee ───────────── */}
      <section aria-label="مزايا الرموش اليومية" className="bg-pink py-5 text-plum">
        <Marquee
          className="font-display text-2xl sm:text-3xl"
          items={["Daily Lashes · رموش يومية", `${arDigits(shop.boxPrice)} ${shop.currency} للعلبة`, "Serag Lashes", "ستة تصاميم", "ضعيها في دقائق", "اطلبي عبر واتساب"]}
        />
      </section>

      {/* ───────────── Collection ───────────── */}
      <section id="collection" className="relative scroll-mt-24 overflow-clip py-28 sm:py-36">
        <div className="glow-pink pointer-events-none absolute top-40 -left-40 h-[36rem] w-[36rem] opacity-70" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <header className="mx-auto max-w-2xl text-center">
            <Reveal as="p" className="eyebrow flex items-center justify-center gap-3 text-berry">
              <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
              <span dir="ltr">The Collection</span>
              <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
            </Reveal>
            <Reveal as="h2" delay={80} className="font-display mt-5 text-[2.3rem] leading-[1.3] text-plum sm:text-6xl sm:leading-[1.25]">
              اختاري نظرتكِ <span className="font-script text-rose-ink">اليومية</span>
            </Reveal>
            <Reveal as="p" delay={160} className="mt-5 text-lg leading-8 text-berry-deep/80">
              أضيفي ما يعجبكِ إلى السلة، ثم أرسلي الطلب عبر واتساب ونرتب معكِ التوصيل.
            </Reveal>
            <Reveal as="p" delay={200} className="mt-3 text-sm text-rose-ink">
              اضغطي على أي علبة لفتحها
            </Reveal>
            <Reveal delay={220}>
              <LashDivider className="mx-auto mt-8 w-48 text-pink-deep" />
            </Reveal>
          </header>

          <div className="mt-20">
            <ShopCatalog />
          </div>
        </div>
      </section>

      {/* ───────────── How to apply ───────────── */}
      <section className="relative overflow-clip bg-gradient-to-b from-pink-soft to-petal py-28 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <Reveal as="p" className="eyebrow flex items-center gap-3 text-berry">
                <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
                <span dir="ltr">How To Wear</span>
              </Reveal>
              <Reveal as="h2" delay={80} className="font-display mt-5 text-[2.2rem] leading-[1.3] text-plum sm:text-5xl sm:leading-[1.25]">
                أربع خطوات، ونظرتكِ جاهزة
              </Reveal>
            </div>
            <Reveal delay={160} className="text-plum">
              <LashPair style="classic" map="cat" seed={2} className="mx-auto w-full max-w-md" />
            </Reveal>
          </div>

          <ol className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {applySteps.map((s, i) => (
              <Reveal
                as="li"
                key={s.title}
                delay={i * 110}
                className="group relative overflow-hidden rounded-[1.75rem] border border-berry/10 bg-ivory/80 p-7 transition-transform duration-500 hover:-translate-y-1.5"
              >
                <span className="font-display absolute -top-4 -left-1 text-[6.5rem] leading-none text-pink-soft transition-colors duration-500 group-hover:text-pink" aria-hidden="true">
                  {arDigits(i + 1)}
                </span>
                <h3 className="relative mt-14 text-xl font-semibold text-plum">{s.title}</h3>
                <p className="relative mt-3 leading-7 text-berry-deep/80">{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Daily vs studio ───────────── */}
      <section className="py-28 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal as="h2" className="font-display text-center text-[2.2rem] leading-[1.3] text-plum sm:text-5xl">
            يومية أم تركيب في الاستوديو؟
          </Reveal>
          <Reveal as="p" delay={80} className="mx-auto mt-5 max-w-xl text-center text-lg text-berry-deep/80">
            لا داعي للاختيار: كثيرات يجمعن بينهما.
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <Reveal delay={120} className="rounded-[2rem] bg-gradient-to-br from-pink-soft to-pink p-8 text-plum sm:p-10">
              <p className="font-display text-lg text-berry italic" dir="ltr">
                Daily Lashes
              </p>
              <h3 className="font-naskh mt-2 text-3xl">الرموش اليومية</h3>
              <ul className="mt-6 space-y-3">
                {["تضعينها وتنزعينها بنفسكِ", "تغيّرين التصميم حسب المناسبة", "مثالية لتجربة الشكل قبل التركيب"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-plum text-pink-soft">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <a href="#collection" className="btn btn-berry mt-8">
                تسوّقي الآن
              </a>
            </Reveal>

            <Reveal delay={200} className="rounded-[2rem] bg-ink p-8 text-ivory sm:p-10">
              <p className="font-display text-lg text-gold-soft italic" dir="ltr">
                Lash Extensions
              </p>
              <h3 className="font-naskh mt-2 text-3xl">تركيب في الاستوديو</h3>
              <ul className="mt-6 space-y-3">
                {["تدوم أسابيع مع التعبئة", "تستيقظين بنظرة جاهزة كل صباح", "خريطة مرسومة على مقاس عينيكِ"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-gold text-ink">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/booking" className="mt-8">
                احجزي موعدكِ
              </ButtonLink>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────── Final CTA ───────────── */}
      <section className="relative overflow-clip bg-gradient-to-b from-berry to-berry-deep py-24 text-center text-ivory sm:py-28">
        <div className="glow-pink drift pointer-events-none absolute top-0 left-1/2 h-[30rem] w-[40rem] -translate-x-1/2 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
          <Reveal className="mx-auto w-56 text-pink-soft">
            <LashPair style="volume" map="doll" seed={4} />
          </Reveal>
          <Reveal as="h2" delay={100} className="font-display mt-8 text-4xl leading-[1.35] sm:text-6xl sm:leading-[1.25]">
            علبتكِ القادمة <span className="font-script text-pink-grad">بانتظاركِ</span>
          </Reveal>
          <Reveal as="p" delay={180} className="mx-auto mt-5 max-w-lg text-lg text-ivory/80">
            {arDigits(shop.boxPrice)} {shop.currency} للعلبة. اختاري تصميمكِ واطلبي خلال دقيقة.
          </Reveal>
          <Reveal delay={260} className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="#collection" className="btn btn-pink">
              اختاري تصميمكِ
            </a>
            <ButtonLink href={whatsappLink(`مرحبًا ${site.nameAr}، أودّ طلب رموش يومية`)} variant="ghost-light" arrow={false} external>
              <span className="flex items-center gap-2">
                <WhatsApp className="h-5 w-5" /> اطلبي عبر واتساب
              </span>
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
