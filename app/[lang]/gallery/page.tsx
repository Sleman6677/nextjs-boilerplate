import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LashEye } from "@/components/art";
import { BeforeAfter } from "@/components/before-after";
import { GalleryGrid } from "@/components/gallery-grid";
import { Instagram } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { ButtonLink, PageHero, SectionHeading } from "@/components/ui";
import { href, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/gallery">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang).gallery;
  return { title: d.metaTitle, description: d.metaDesc };
}

export default async function GalleryPage({ params }: PageProps<"/[lang]/gallery">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const d = dict.gallery;

  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        title={d.title}
        lead={d.lead}
        art={
          <div className="grid grid-cols-2 gap-4">
            {(["classic", "volume", "hybrid", "mega"] as const).map((st, i) => (
              <div key={st} className={`arch relative aspect-[3/4] overflow-hidden border border-gold/25 bg-ink-2 ${i % 2 ? "mt-10" : ""}`}>
                <div className="absolute inset-0 grid place-items-center px-4 text-gold-soft">
                  <LashEye style={st} map={i % 2 ? "cat" : "doll"} seed={i + 20} draw baseDelay={400 + i * 200} className="w-full" />
                </div>
              </div>
            ))}
          </div>
        }
      />

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <GalleryGrid />
        </div>
      </section>

      <section className="bg-ivory py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <SectionHeading align="center" eyebrow="Before · After" title={d.baTitle} lead={d.baLead} />
          <Reveal variant="mask" className="mt-14">
            <BeforeAfter />
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-clip bg-ink py-24 text-ivory sm:py-28">
        <div className="glow pointer-events-none absolute -bottom-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-5 text-center sm:px-8">
          <Reveal className="grid h-16 w-16 place-items-center rounded-full border border-gold/40 text-gold-soft">
            <Instagram className="h-7 w-7" />
          </Reveal>
          <Reveal as="h2" delay={80} className="font-display mt-8 text-4xl leading-[1.35] sm:text-5xl">
            {d.igTitle}
          </Reveal>
          <Reveal as="p" delay={160} className="mt-5 text-lg text-ivory/75">
            {d.igLead}
          </Reveal>
          <Reveal delay={240} className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href={`https://instagram.com/${site.instagram}`} external>
              <span dir="ltr">@{site.instagram}</span>
            </ButtonLink>
            <ButtonLink href={href(lang, "/booking")} variant="ghost-light" arrow={false}>
              {dict.nav.book}
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}
