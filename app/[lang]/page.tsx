import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LashEye } from "@/components/art";
import { socialLinks } from "@/components/chrome";
import { ArrowForward, Coin, Gift, Shield, Truck } from "@/components/icons";
import { KohlStroke } from "@/components/kohl";
import { BoxScene } from "@/components/shop/box-scene";
import { HeroAdd } from "@/components/shop/hero-add";
import { ProductCard, PriceTag } from "@/components/shop/product-card";
import { getHome, isNewProduct, type OfferInfo, type Product } from "@/lib/catalog";
import { href, isLocale, type Locale } from "@/lib/i18n/config";
import { localized, money, t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import type { LashMap } from "@/lib/lash";
import { round2 } from "@/lib/pricing";
import { getStoreInfo } from "@/lib/social";

const MAPS: LashMap[] = ["natural", "cat", "doll", "squirrel"];

function Grid({ title, products, offers, lang, seeAll, bestIds = [] }: { title: string; products: Product[]; offers: OfferInfo[]; lang: Locale; seeAll: string; bestIds?: string[] }) {
  if (products.length === 0) return null;
  return (
    <section className="py-20 sm:py-28" aria-labelledby="grid-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-10 flex items-end justify-between gap-6">
          <h2 id="grid-title" className="font-display text-4xl sm:text-6xl">
            {title}
          </h2>
          <Link href={href(lang, "/shop")} className="kohl-trigger inline-flex min-h-11 shrink-0 flex-col justify-center text-[0.9375rem] font-medium">
            <span className="inline-flex items-center gap-2">
              {seeAll}
              <ArrowForward className="h-4 w-4" />
            </span>
            <KohlStroke />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-3">
          {products.slice(0, 6).map((p, i) => (
            <li key={p.id}>
              <ProductCard p={p} offers={offers} index={i} isNew={isNewProduct(p)} best={bestIds.includes(p.id)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await connection();
  const dict = getDictionary(lang);
  const h = dict.store.home;
  const k = h.kohl;
  const [home, info] = await Promise.all([getHome(), getStoreInfo()]);
  const all = home.categories.flatMap((c) => c.products);
  const standard = all.filter((p) => p.kind === "standard");
  const featured = standard.filter((p) => p.featured);
  const hero = featured[0] ?? standard[0];
  const gift = home.giftCards[0];
  const giftPaid = gift ? gift.price : 0;
  const bestIds = home.bestSellers.slice(0, 3).map((p) => p.id);
  const perkIcons = [<Truck key="t" className="h-5 w-5" />, <Coin key="c" className="h-5 w-5" />, <Shield key="s" className="h-5 w-5" />];

  return (
    <>
      {/* ───────────── First screen: the real box, its facts, and the way to buy it ───────────── */}
      <section data-box-scene className="relative lg:h-[220svh]">
        <div className="mx-auto grid max-w-7xl items-start gap-8 px-5 pt-32 pb-16 sm:px-8 lg:sticky lg:top-0 lg:h-svh lg:grid-cols-12 lg:gap-x-6 lg:pt-36 lg:pb-10">
          <div className="lg:col-span-6">
            <h1 className="font-display text-[3.25rem] leading-[1.02] sm:text-7xl lg:text-[5.5rem]">{h.title}</h1>
            <KohlStroke on="load" delay={500} className="mt-4 h-4 w-48 sm:w-64" />
            <p className="mt-6 max-w-md text-lg leading-8 text-taupe">{h.text}</p>

            {hero ? (
              <p className="mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm text-taupe">{k.heroLabel}</span>
                <Link href={href(lang, `/p/${hero.slug}`)} className="text-lg font-medium">
                  {localized(hero.name, lang)}
                </Link>
                <PriceTag p={hero} />
              </p>
            ) : null}
            {hero ? (
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
                <HeroAdd p={hero} />
                <Link href={href(lang, "/shop")} className="kohl-trigger inline-flex min-h-11 flex-col justify-center font-medium">
                  <span>{h.seeAll}</span>
                  <KohlStroke />
                </Link>
              </div>
            ) : null}

            <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6">
              {k.facts.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[0.9375rem] font-medium">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-copper ring-1 ring-kohl" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="sticky top-[4.75rem] z-10 order-first -mx-2 bg-stone pb-2 lg:static lg:order-none lg:col-span-6 lg:mx-0 lg:bg-transparent lg:pb-0">
            <BoxScene alt={k.boxAlt} />
          </div>
        </div>
      </section>

      {/* ───────────── Store promises ───────────── */}
      <section aria-label={h.perks.map((p) => p.title).join(" · ")} className="border-y border-line">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <ul className="grid gap-4 py-6 sm:grid-cols-3">
            {h.perks.map((perk, i) => (
              <li key={perk.title} className="flex items-start gap-3">
                <span className="mt-0.5 text-pink-deep">{perkIcons[i]}</span>
                <span className="text-sm leading-6">
                  <span className="block font-medium">{perk.title}</span>
                  <span className="block text-taupe">{i === 0 ? (info.freeShippingThreshold !== null ? t(perk.text, { amount: money(info.freeShippingThreshold, lang) }) : h.perkFreeAlways) : perk.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── The lashes ───────────── */}
      <Grid title={h.newArrivals} products={standard} offers={home.offers} lang={lang} seeAll={h.seeAll} bestIds={bestIds} />

      {/* ───────────── Kohl band: the four lash maps the designs come from ───────────── */}
      <section className="bg-kohl py-20 text-stone sm:py-28" aria-labelledby="maps-title">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-x-6">
            <h2 id="maps-title" className="font-display text-4xl sm:text-6xl lg:col-span-6">
              {k.mapsTitle}
            </h2>
            <p className="max-w-xl text-lg leading-8 text-[#bdbdbd] lg:col-span-6">{dict.shop.lead}</p>
          </div>
          <ul className="mt-14 grid gap-px overflow-hidden rounded-[20px] bg-[#262626] sm:grid-cols-2 lg:grid-cols-4">
            {MAPS.map((m, i) => (
              <li key={m} className="kohl-trigger bg-kohl p-6 sm:p-8">
                <LashEye style="classic" map={m} seed={20 + i} showCrease={false} lidWidth={2.6} className="w-full text-stone" />
                <h3 className="mt-6 text-xl font-medium">{dict.maps[m].name}</h3>
                <KohlStroke className="mt-1 w-20 !text-copper" />
                <p className="mt-3 text-[0.9375rem] leading-7 text-[#bdbdbd]">{dict.maps[m].text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── Gift card ───────────── */}
      {gift ? (
        <section className="py-20 sm:py-28" aria-labelledby="gift-title">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h2 id="gift-title" className="font-display text-4xl sm:text-6xl">
                {h.giftTitle}
              </h2>
              <p className="mt-6 max-w-md text-lg leading-8 text-taupe">{t(h.giftText, { paid: money(giftPaid, lang), value: money(round2(giftPaid * (1 + info.giftCardBonusPct / 100)), lang) })}</p>
              <Link href={href(lang, `/p/${gift.slug}`)} className="btn btn-ink mt-10">
                <Gift className="h-5 w-5" /> {h.giftCta}
              </Link>
            </div>
            <div className="mx-auto w-full max-w-sm rounded-[20px] bg-copper p-8 text-kohl">
              <p className="text-lg font-medium" dir="ltr">
                Serag Lashes
              </p>
              <KohlStroke className="mt-2 w-24" on="load" delay={300} />
              <p className="font-display mt-16 text-5xl">{money(round2(giftPaid * (1 + info.giftCardBonusPct / 100)), lang)}</p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ───────────── Where to follow ───────────── */}
      <section className="border-t border-line py-20 sm:py-24" aria-labelledby="social-title">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 id="social-title" className="font-display text-4xl sm:text-5xl">
              {h.socialTitle}
            </h2>
            <p className="mt-4 text-lg leading-8 text-taupe">{h.socialText}</p>
            <Link href={href(lang, "/shop")} className="btn btn-gold mt-8">
              {h.cta}
            </Link>
          </div>
          <ul className="flex flex-wrap gap-3">
            {socialLinks(info, lang).map((s) => (
              <li key={s.key}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-dark">
                  {s.icon} {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
