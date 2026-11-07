import { SplitTitle } from "@/components/split-title";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowForward } from "@/components/icons";
import { ProductCard, Stars } from "@/components/shop/product-card";
import { ProductView } from "@/components/shop/product-view";
import { getProductBySlug, isNewProduct } from "@/lib/catalog";
import { href, isLocale } from "@/lib/i18n/config";
import { date, localized, num, t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { optimizable } from "@/lib/media";
import { getSettings } from "@/lib/orders";
import { siteUrl } from "@/lib/site-url";
import { stockStatus } from "@/lib/stock";
import { accountsEnabled } from "@/lib/supabase/config";

export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps<"/[lang]/p/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const data = await getProductBySlug(slug);
  if (!data) return {};
  const p = data.product;
  return {
    title: localized(p.name, lang),
    description: localized(p.description, lang).slice(0, 160),
    alternates: { canonical: `/${lang}/p/${slug}`, languages: { ar: `/ar/p/${slug}`, he: `/he/p/${slug}`, en: `/en/p/${slug}` } },
    openGraph: { title: localized(p.name, lang), description: localized(p.description, lang).slice(0, 160), images: p.imageUrl ? [p.imageUrl] : undefined, type: "website" },
  };
}

export default async function ProductPage({ params }: PageProps<"/[lang]/p/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  await connection();
  const data = await getProductBySlug(slug);
  if (!data) notFound();
  const { product: p, addons, related, reviews, offers } = data;
  const dict = getDictionary(lang);
  const s = dict.store.product;
  const settings = p.kind === "gift_card" && accountsEnabled() ? await getSettings() : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: localized(p.name, lang),
    description: localized(p.description, lang),
    image: p.images.length ? p.images : undefined,
    sku: p.slug,
    brand: { "@type": "Brand", name: "Serag Lashes" },
    offers: {
      "@type": "Offer",
      priceCurrency: "ILS",
      price: p.displayPrice,
      availability: stockStatus(p) === "out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: `${siteUrl()}/${lang}/p/${p.slug}`,
    },
    aggregateRating: p.rating ? { "@type": "AggregateRating", ratingValue: p.rating.avg, reviewCount: p.rating.count } : undefined,
  };

  return (
    <div className="bg-petal pb-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="bg-gradient-to-b from-plum to-berry-deep pt-32 pb-8 sm:pt-36">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Link href={href(lang, "/shop")} className="inline-flex min-h-11 items-center gap-2 text-sm text-pink-soft/90 hover:text-ivory">
            <ArrowForward className="h-4 w-4 rotate-180" /> {s.back}
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-7xl px-5 sm:px-8">
        <ProductView p={p} offers={offers} addons={addons} gift={settings ? { bonusPct: settings.giftCardBonusPct, validMonths: settings.giftCardValidMonths } : null} />

        {p.kind === "standard" ? (
          <section id="reviews" className="mt-24 scroll-mt-28" aria-labelledby="reviews-title">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-berry/15 pb-5">
              <SplitTitle id="reviews-title" className="font-display text-4xl text-plum" text={s.reviews} />
              {p.rating ? (
                <p className="flex items-center gap-2 text-berry-deep/80">
                  <Stars value={p.rating.avg} /> {t(s.rating, { avg: num(p.rating.avg, lang) })} {t(s.reviewsCount, { count: num(p.rating.count, lang) })}
                </p>
              ) : null}
            </div>
            {reviews.length === 0 ? (
              <p className="mt-6 text-berry-deep/70">{s.noReviews}</p>
            ) : (
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-[1.6rem] border border-berry/10 bg-ivory p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Stars value={r.rating} />
                      <span className="text-xs text-berry-deep/60">{date(r.createdAt, lang)}</span>
                    </div>
                    {r.body ? <p className="mt-3 leading-8 text-berry-deep/90">{r.body}</p> : null}
                    {r.imageUrl ? (
                      <span className="relative mt-3 block h-40 w-32 overflow-hidden rounded-xl">
                        <Image src={r.imageUrl} alt="" fill sizes="128px" unoptimized={!optimizable(r.imageUrl)} className="object-cover" />
                      </span>
                    ) : null}
                    {r.author ? <p className="mt-3 text-sm font-semibold text-plum">{r.author}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-24" aria-labelledby="related-title">
            <SplitTitle id="related-title" className="font-display text-4xl text-plum" text={s.related} />
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
              {related.map((r, i) => (
                <li key={r.id}>
                  <ProductCard p={r} offers={offers} index={i} isNew={isNewProduct(r)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
