import { SplitTitle } from "@/components/split-title";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { CSSProperties } from "react";
import { socialLinks } from "@/components/chrome";
import { ArrowForward, Coin, Gift, Shield, Truck } from "@/components/icons";
import { BoxVisual } from "@/components/lash-box";
import { Reveal } from "@/components/reveal";
import SplitText from "@/components/SplitText";
import { MagnetLink, Shiny, Statement } from "@/components/fx";
import { VelocityMarquee } from "@/components/velocity-marquee";
import { HeroBoxPlayer } from "@/components/shop/hero-box";
import { ProductCard } from "@/components/shop/product-card";
import { SignatureShowcase } from "@/components/shop/signature-showcase";
import { getHome, isNewProduct, type Category, type OfferInfo, type Product } from "@/lib/catalog";
import { href, isLocale, type Locale } from "@/lib/i18n/config";
import { localized, money, t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { optimizable } from "@/lib/media";
import { round2 } from "@/lib/pricing";
import { shop } from "@/lib/site";
import { getStoreInfo } from "@/lib/social";

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

function Row({ title, products, offers, lang, seeAll, bestIds = [] }: { title: string; products: Product[]; offers: OfferInfo[]; lang: Locale; seeAll: string; bestIds?: string[] }) {
  if (products.length === 0) return null;
  return (
    <section className="py-16 sm:py-20" aria-label={title}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <SplitTitle className="font-display text-4xl text-plum sm:text-5xl" text={title} />
          <Link href={href(lang, "/shop")} className="group inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-berry">
            {seeAll}
            <ArrowForward className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
          </Link>
        </div>
        <ul data-stagger className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {products.slice(0, 8).map((p, i) => (
            <li key={p.id} className="w-[46%] shrink-0 snap-start sm:w-auto">
              <ProductCard p={p} offers={offers} index={i} isNew={isNewProduct(p)} best={bestIds.includes(p.id)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CategoryTile({ c, lang, index }: { c: Category; lang: Locale; index: number }) {
  const cover = c.imageUrl ?? c.products.find((p) => p.imageUrl)?.imageUrl ?? null;
  const first = c.products[0];
  return (
    <Reveal as="li" delay={index * 120}>
      <Link href={href(lang, `/shop?c=${c.slug}#collection`)} className="group relative block overflow-hidden rounded-[2rem] bg-pink-soft">
        <span data-zoom-in className="relative block aspect-[4/5]">
          {cover ? (
            <Image src={cover} alt="" fill sizes="(min-width:640px) 33vw, 100vw" unoptimized={!optimizable(cover)} className="object-cover transition-transform duration-700 ease-[var(--ease-silk)] group-hover:scale-105" />
          ) : first ? (
            <span className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
              <BoxVisual art={first.art} label={c.name.en || "Serag"} index={index} />
            </span>
          ) : null}
          <span className="absolute inset-0 bg-gradient-to-t from-plum/85 via-plum/10 to-transparent" aria-hidden="true" />
        </span>
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6 text-ivory">
          <span>
            <span className="font-display block text-3xl">{localized(c.name, lang)}</span>
            {localized(c.description, lang) ? <span className="mt-1 block text-sm text-pink-soft/90">{localized(c.description, lang)}</span> : null}
          </span>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ivory text-plum transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1">
            <ArrowForward className="h-4 w-4" />
          </span>
        </span>
      </Link>
    </Reveal>
  );
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await connection();
  const dict = getDictionary(lang);
  const h = dict.store.home;
  const heroWords = h.title.split(" ");
  const [home, info] = await Promise.all([getHome(), getStoreInfo()]);
  const all = home.categories.flatMap((c) => c.products);
  const from = all.length ? Math.min(...all.map((p) => p.displayPrice)) : shop.boxPrice;
  const gift = home.giftCards[0];
  // Signature stage: best sellers once there are sales, otherwise featured, otherwise everything.
  const standard = all.filter((p) => p.kind === "standard");
  const hasBest = home.bestSellers.length >= 3;
  const featured = standard.filter((p) => p.featured);
  const signature = hasBest ? home.bestSellers : featured.length >= 3 ? featured : standard;
  const giftPaid = gift ? gift.price : 0;
  const perkIcons = [<Truck key="t" className="h-6 w-6" />, <Coin key="c" className="h-6 w-6" />, <Shield key="s" className="h-6 w-6" />];

  return (
    <div className="bg-petal">
      {/* ───────────── Hero ───────────── */}
      <section className="relative isolate overflow-clip bg-gradient-to-b from-plum via-berry-deep to-berry text-ivory">
        <div className="glow-pink drift pointer-events-none absolute -top-32 right-[-10%] -z-10 h-[34rem] w-[34rem] opacity-60" aria-hidden="true" />
        <div className="glow-pink drift pointer-events-none absolute bottom-[-20%] left-[-12%] -z-10 h-[30rem] w-[30rem] opacity-40" style={v({ "--d": "-6s" })} aria-hidden="true" />
        <p className="font-display pointer-events-none absolute -bottom-[0.2em] right-0 -z-10 text-[30vw] leading-none text-transparent italic select-none [-webkit-text-stroke:1px_rgba(248,215,223,0.14)] lg:text-[22rem]" dir="ltr" data-drift="-30" aria-hidden="true">
          Serag
        </p>
        <div data-hero-out className="mx-auto grid min-h-[92svh] max-w-7xl items-center gap-16 px-5 pt-36 pb-20 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div>
            <p className="eyebrow fade-in flex items-center gap-3 text-pink">
              <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
              <Shiny>{h.eyebrow}</Shiny>
            </p>
            <h1 className="font-display mt-8 text-[3.2rem] leading-[1.25] sm:text-7xl lg:text-[5.4rem] lg:leading-[1.15]">
              {/* Words (not letters) are split so Arabic letters keep joining. */}
              {heroWords.slice(0, -1).map((w, i) => (
                <span key={i}>
                  <SplitText tag="span" text={w} textAlign="start" className="align-bottom pt-[0.08em] pb-[0.22em] -mt-[0.08em] -mb-[0.22em]" splitType="words" effect="rise" trigger="load" duration={0.9} delay={250 + i * 90} />{" "}
                </span>
              ))}
              <span className="rise">
                <span className="w">
                  <span style={v({ "--i": heroWords.length - 1 })} className="font-script text-pink-grad">
                    {heroWords[heroWords.length - 1]}
                  </span>
                </span>
              </span>
            </h1>
            <p className="fade-in mt-8 max-w-lg text-lg leading-9 text-ivory/80" style={v({ "--d": "700ms" })}>
              {h.text}
            </p>
            <div className="fade-in mt-10 flex flex-wrap gap-3" style={v({ "--d": "900ms" })}>
              <MagnetLink>
                <Link href={href(lang, "/shop")} className="btn btn-pink group">
                  {h.cta}
                  <ArrowForward className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                </Link>
              </MagnetLink>
              {gift ? (
                <Link href={href(lang, `/p/${gift.slug}`)} className="btn btn-ghost-light">
                  <Gift className="h-5 w-5" /> {h.secondary}
                </Link>
              ) : null}
            </div>
            <ul className="fade-in mt-10 flex gap-3" style={v({ "--d": "1100ms" })}>
              {socialLinks(info, lang).map((s) => (
                <li key={s.key}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-full border border-pink/30 px-4 text-sm text-pink-soft transition-colors hover:border-pink hover:bg-pink hover:text-plum">
                    {s.icon}
                    <span>{s.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-8 sm:px-12">
            <HeroBoxPlayer price={t(dict.store.product.from, { price: money(from, lang) })} />
          </div>
        </div>
      </section>

      {/* ───────────── Perks ───────────── */}
      <section aria-label={h.eyebrow} className="border-b border-berry/10 bg-ivory">
        <ul data-stagger className="mx-auto grid max-w-7xl gap-px px-5 sm:grid-cols-3 sm:px-8">
          {h.perks.map((perk, i) => (
            <li key={perk.title} className="flex items-center gap-4 py-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pink-soft text-berry">{perkIcons[i]}</span>
              <span>
                <span className="block font-semibold text-plum">{perk.title}</span>
                <span className="block text-sm text-berry-deep/75">{i === 0 ? (info.freeShippingThreshold !== null ? t(perk.text, { amount: money(info.freeShippingThreshold, lang) }) : h.perkFreeAlways) : perk.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────────── Marquee (speeds up with scroll) ───────────── */}
      <VelocityMarquee items={[...h.eyebrow.split(" · "), ...h.perks.map((p) => p.title)]} className="font-display border-b border-berry/10 bg-plum py-5 text-3xl text-pink-soft sm:py-7 sm:text-5xl" />

      {/* ───────────── Categories ───────────── */}
      {home.categories.length > 1 ? (
        <section className="py-20 sm:py-24" aria-labelledby="cats-title">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SplitTitle id="cats-title" className="font-display text-4xl text-plum sm:text-5xl" text={h.categories} />
            <ul className="mt-10 grid gap-5 sm:grid-cols-3">
              {home.categories.slice(0, 3).map((c, i) => (
                <CategoryTile key={c.id} c={c} lang={lang} index={i} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <Row title={h.newArrivals} products={home.newArrivals} offers={home.offers} lang={lang} seeAll={h.seeAll} bestIds={home.bestSellers.slice(0, 3).map((p) => p.id)} />
      {home.onSale.length > 0 ? (
        <div className="bg-gradient-to-b from-pink-soft/70 to-petal">
          <Row title={h.onSale} products={home.onSale} offers={home.offers} lang={lang} seeAll={h.seeAll} />
        </div>
      ) : null}
      {signature.length >= 3 ? (
        <SignatureShowcase products={signature.slice(0, 7)} title={hasBest ? h.bestSellers : h.showcase.label} eyebrow={hasBest ? h.showcase.label : "Serag · Daily Lashes"} />
      ) : (
        <Row title={h.bestSellers} products={home.bestSellers} offers={home.offers} lang={lang} seeAll={h.seeAll} bestIds={home.bestSellers.map((p) => p.id)} />
      )}

      {/* ───────────── Gift card ───────────── */}
      {gift ? (
        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <Reveal className="relative mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2.5rem] bg-plum p-8 text-ivory sm:p-14 lg:grid-cols-[1.2fr_1fr]">
            <div className="glow-pink pointer-events-none absolute -top-20 -left-20 h-80 w-80 opacity-50" aria-hidden="true" />
            <div className="relative">
              <Gift className="h-10 w-10 text-pink" />
              <SplitTitle className="font-display mt-6 text-4xl sm:text-5xl" text={h.giftTitle} />
              <p className="mt-4 max-w-md text-lg leading-8 text-ivory/80">{t(h.giftText, { paid: money(giftPaid, lang), value: money(round2(giftPaid * (1 + info.giftCardBonusPct / 100)), lang) })}</p>
              <div className="mt-8">
                <MagnetLink>
                  <Link href={href(lang, `/p/${gift.slug}`)} className="btn btn-pink">
                    {h.giftCta}
                  </Link>
                </MagnetLink>
              </div>
            </div>
            <div data-scroll-tilt className="relative mx-auto w-full max-w-xs rotate-[-6deg] rounded-[1.6rem] bg-gradient-to-br from-pink to-pink-deep p-6 text-plum shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
              <p className="font-display text-2xl italic" dir="ltr">
                Serag Lashes
              </p>
              <p className="font-display mt-10 text-5xl">{money(round2(giftPaid * (1 + info.giftCardBonusPct / 100)), lang)}</p>
              <p className="mt-2 font-mono text-sm tracking-[0.3em]" dir="ltr">
                XXXX-XXXX-XXXX
              </p>
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* ───────────── Social ───────────── */}
      <section className="py-20 text-center sm:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <SplitTitle className="font-display text-4xl text-plum sm:text-5xl" text={h.socialTitle} />
          <Statement className="mx-auto mt-4 max-w-lg text-lg text-berry-deep/80">{h.socialText}</Statement>
          <Reveal delay={160} className="mt-10 flex flex-wrap justify-center gap-3">
            {socialLinks(info, lang).map((s, i) => (
              <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" className={`btn min-h-14 px-7 ${i === 0 ? "btn-berry" : "btn-ghost-dark"}`}>
                {s.icon} {s.label}
              </a>
            ))}
          </Reveal>
        </div>
      </section>
    </div>
  );
}
