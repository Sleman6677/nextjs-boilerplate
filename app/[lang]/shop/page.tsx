import { SplitTitle } from "@/components/split-title";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LashDivider } from "@/components/art";
import { Gift, WhatsApp } from "@/components/icons";
import { LashPair } from "@/components/lash-box";
import { Reveal } from "@/components/reveal";
import { CatalogGrid } from "@/components/shop/catalog-grid";
import { ProductCard } from "@/components/shop/product-card";
import { getHome, isNewProduct } from "@/lib/catalog";
import { isLocale } from "@/lib/i18n/config";
import { num } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { whatsappLink } from "@/lib/site";
import { accountsEnabled } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/shop">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return { title: d.store.nav.shop, description: d.shop.metaDesc, alternates: { canonical: `/${lang}/shop`, languages: { ar: "/ar/shop", he: "/he/shop", en: "/en/shop" } } };
}

export default async function ShopPage({ params, searchParams }: PageProps<"/[lang]/shop">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const s = dict.shop;
  // Rendered per visit so owner changes (products, prices, stock) show at once.
  await connection();
  const sp = await searchParams;
  const home = await getHome();
  const all = home.categories.flatMap((c) => c.products);

  return (
    <div className="bg-petal">
      <section className="relative isolate overflow-clip bg-white border-b border-mist-gray pt-36 pb-16 text-inkwell sm:pt-40">
        <div className="glow-pink drift pointer-events-none absolute -top-32 right-[-10%] -z-10 h-[30rem] w-[30rem] opacity-50" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className="eyebrow flex items-center gap-3 text-smoke">
            <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
            <span>{dict.store.home.eyebrow}</span>
          </p>
          <SplitTitle as="h1" className="font-display mt-6 text-6xl leading-[0.95] sm:text-[8rem]" text={dict.store.nav.shop} />
          <p className="mt-6 max-w-xl text-base leading-7 text-taupe">{s.collLead}</p>
        </div>
      </section>

      {!accountsEnabled() ? (
        <p className="bg-tangerine px-5 py-4 text-center text-sm text-white">
          {dict.store.setup}{" "}
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
            <WhatsApp className="h-4 w-4" /> {dict.store.orderOnWhatsapp}
          </a>
        </p>
      ) : null}

      <section id="collection" className="relative scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <CatalogGrid
            categories={home.categories}
            offers={home.offers}
            newIds={all.filter(isNewProduct).map((p) => p.id)}
            bestIds={home.bestSellers.slice(0, 3).map((p) => p.id)}
            initial={typeof sp.c === "string" ? sp.c : "all"}
          />
        </div>
      </section>

      {home.giftCards.length > 0 ? (
        <section id="gift-cards" className="scroll-mt-24 bg-gradient-to-b from-pink-soft to-petal py-20" aria-labelledby="gift-title">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <h2 id="gift-title" className="font-display flex items-center gap-3 text-4xl text-plum">
              <Gift className="h-8 w-8 text-berry" /> {dict.store.nav.giftCards}
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
              {home.giftCards.map((g, i) => (
                <li key={g.id}>
                  <ProductCard p={g} offers={home.offers} index={i} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="relative overflow-clip py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <Reveal as="p" className="eyebrow flex items-center gap-3 text-berry">
                <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
                <span dir="ltr">How To Wear</span>
              </Reveal>
              <Reveal as="h2" delay={80} className="font-display mt-5 text-[2.2rem] leading-[1.3] text-plum sm:text-5xl sm:leading-[1.25]">
                {s.howTitle}
              </Reveal>
            </div>
            <Reveal delay={160} className="text-plum">
              <LashPair style="classic" map="cat" seed={2} className="mx-auto w-full max-w-md" />
            </Reveal>
          </div>
          <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {s.steps.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 110} className="group relative overflow-hidden rounded-[1.75rem] border border-berry/10 bg-ivory/80 p-7 transition-transform duration-500 hover:-translate-y-1.5">
                <span className="font-display absolute -top-4 -end-1 text-[6.5rem] leading-none text-pink-soft transition-colors duration-500 group-hover:text-pink" aria-hidden="true">
                  {num(i + 1, lang)}
                </span>
                <h3 className="relative mt-14 text-xl font-semibold text-plum">{step.title}</h3>
                <p className="relative mt-3 leading-7 text-berry-deep/80">{step.text}</p>
              </Reveal>
            ))}
          </ol>
          <LashDivider className="mx-auto mt-16 w-48 text-pink-deep" />
          <p className="mt-6 text-center">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-berry hover:underline">
              <WhatsApp className="h-5 w-5" /> {dict.store.social.chat}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
