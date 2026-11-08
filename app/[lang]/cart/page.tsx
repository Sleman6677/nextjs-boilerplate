import { SplitTitle } from "@/components/split-title";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CartView } from "@/components/shop/cart-view";
import { getAddonsFor, getStore } from "@/lib/catalog";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { listZones } from "@/lib/orders";
import { whatsappLink } from "@/lib/site";
import { accountsEnabled } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/cart">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).store.cart.title, robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  // Rendered per visit so owner changes (products, prices, settings) show at once.
  await connection();
  const store = await getStore();
  const products = [...store.all.values()];
  const enabled = accountsEnabled();
  const [zones, addons] = enabled ? await Promise.all([listZones(), getAddonsFor(products.map((p) => p.id))]) : [[], {}];

  return (
    <div className="min-h-[70svh] bg-petal pb-24">
      <div className="bg-white border-b border-mist-gray pt-36 pb-12 text-inkwell sm:pt-44">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SplitTitle as="h1" className="font-display text-5xl sm:text-7xl" text={dict.store.cart.title} />
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl px-5 sm:px-8">
        {enabled ? (
          <CartView products={products} zones={zones} addons={addons} />
        ) : (
          <p className="rounded-[2rem] bg-ivory p-8 text-center text-plum">
            {dict.store.setup}{" "}
            <a href={whatsappLink()} className="font-semibold text-berry underline" target="_blank" rel="noopener noreferrer">
              {dict.store.orderOnWhatsapp}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
