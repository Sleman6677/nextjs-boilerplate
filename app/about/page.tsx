import type { Metadata } from "next";
import { LashDivider, LashEye, RotatingBadge } from "@/components/art";
import { Check } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { ButtonLink, PageHero, SectionHeading } from "@/components/ui";
import { arDigits } from "@/lib/site";

export const metadata: Metadata = {
  title: "قصتنا",
  description: "سراج لاشز: اسمٌ من الضوء، واستوديو يرسم الرموش بعناية ودقة وهدوء.",
};

const values = [
  { word: "دقّة", latin: "Precision", text: "كل رمشة تُعزل وتُثبَّت وحدها. نعمل ببطء متعمَّد لأن النتيجة تستحق." },
  { word: "هدوء", latin: "Calm", text: "إضاءة دافئة، موسيقى خافتة، وسرير مريح. جلستكِ استراحة لا موعد عابر." },
  { word: "أمان", latin: "Safety", text: "مواد مخصّصة لمنطقة العين، تعقيم لكل أداة، واختبار حساسية عند الحاجة." },
];

const promise = [
  "أدوات معقّمة وأغطية تُستخدم لمرة واحدة",
  "لاصق مخصص للعين مع خيار للعيون الحساسة",
  "تقييم لقوة رموشكِ الطبيعية قبل اختيار الوزن",
  "دليل عناية مكتوب بعد كل جلسة",
  "تذكير بموعد التعبئة المناسب لكِ",
  "إزالة آمنة دون شدّ أو ضرر",
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Story"
        title="اسمٌ من الضوء"
        lead="السِّراج هو المصباح: ضوءٌ هادئ يكشف الجمال دون أن يطغى عليه. هكذا نرى الرموش، إطارًا يُضيء النظرة لا قناعًا يخفيها."
        art={
          <div className="relative mx-auto w-80">
            <div className="arch relative aspect-[4/5] overflow-hidden border border-gold/30 bg-gradient-to-b from-ink-3 to-ink">
              <div className="glow absolute inset-x-0 top-[10%] mx-auto aspect-square w-4/5" aria-hidden="true" />
              <p className="font-script text-gold-grad absolute inset-0 grid place-items-center text-[8rem] leading-none">سراج</p>
            </div>
            <RotatingBadge className="absolute -bottom-8 -left-8 h-28 w-28" />
          </div>
        }
      />

      {/* Story */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal variant="mask" className="relative">
            <div className="arch relative mx-auto aspect-[4/5] max-w-md overflow-hidden bg-blush">
              <div className="glow-rose absolute inset-x-0 top-10 mx-auto aspect-square w-4/5 opacity-80" aria-hidden="true" />
              <div className="absolute inset-0 grid place-items-center px-10 text-rosewood">
                <LashEye style="hybrid" map="squirrel" seed={31} className="w-full" />
              </div>
              <p className="eyebrow absolute inset-x-0 bottom-8 text-center text-rosewood/80" dir="ltr">
                Crafted by hand
              </p>
            </div>
          </Reveal>
          <div>
            <SectionHeading eyebrow="Why We Exist" title="بدأنا من سؤال بسيط: لماذا تبدو كل الرموش متشابهة؟" />
            <Reveal as="p" delay={200} className="mt-8 text-lg leading-9 text-taupe">
              رأينا كثيرًا رموشًا ثقيلة لا تشبه أصحابها، ونتائج متطابقة لعيون مختلفة تمامًا. فقررنا أن نعمل بطريقة أخرى: أن نبدأ
              بالاستماع، ثم بالقياس، ثم بالرسم.
            </Reveal>
            <Reveal as="p" delay={260} className="mt-5 text-lg leading-9 text-taupe">
              في سراج لاشز، لكل عميلة خريطتها الخاصة، تُحفظ وتُطوَّر من جلسة لأخرى، حتى نصل معًا إلى النظرة التي تشعر فيها بأنها
              هي، في أجمل حالاتها.
            </Reveal>
            <Reveal delay={320}>
              <LashDivider className="mt-10 w-48 text-gold-deep" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="relative overflow-clip bg-ink py-24 text-ivory sm:py-32">
        <div className="glow pointer-events-none absolute top-0 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 opacity-30" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeading tone="light" align="center" eyebrow="What We Believe" title="ثلاث كلمات نعمل بها" />
          <ul className="mt-16 grid gap-6 md:grid-cols-3">
            {values.map((v, i) => (
              <Reveal as="li" key={v.word} delay={i * 120} className="arch relative overflow-hidden border border-gold/20 bg-ink-2 px-8 pt-16 pb-10 text-center">
                <span className="font-display absolute inset-x-0 top-6 text-sm tracking-[0.3em] text-gold/60" aria-hidden="true">
                  {arDigits(`0${i + 1}`)}
                </span>
                <p className="font-script text-gold-grad text-7xl leading-[1.5]">{v.word}</p>
                <p className="font-display mt-1 text-gold-soft/80 italic" dir="ltr">
                  {v.latin}
                </p>
                <p className="mx-auto mt-5 max-w-xs leading-8 text-ivory/75">{v.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Promise */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1.3fr]">
          <SectionHeading eyebrow="Our Promise" title="وعدنا لكِ في كل جلسة" lead="معايير لا نتنازل عنها، مهما كان الموعد قصيرًا أو بسيطًا." />
          <ul className="grid gap-4 sm:grid-cols-2">
            {promise.map((p, i) => (
              <Reveal as="li" key={p} delay={i * 70} className="flex items-start gap-4 rounded-2xl border border-cocoa/10 bg-ivory p-5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-gold-soft">
                  <Check className="h-4 w-4" />
                </span>
                <span className="pt-0.5 leading-7 text-cocoa">{p}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Quote */}
      <section className="bg-gradient-to-b from-blush to-cream py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <Reveal as="p" className="font-naskh text-3xl leading-[1.8] text-cocoa sm:text-5xl sm:leading-[1.7]">
            «أجمل الرموش هي التي تجعل من يراكِ يقول: <span className="text-rosewood">ما أجمل عينيكِ</span>، لا: ما أجمل رموشكِ.»
          </Reveal>
          <Reveal delay={120}>
            <LashDivider className="mx-auto mt-10 w-48 text-rosewood" />
          </Reveal>
          <Reveal delay={200} className="mt-12">
            <ButtonLink href="/booking" variant="ink">
              ابدئي رحلتكِ معنا
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}
