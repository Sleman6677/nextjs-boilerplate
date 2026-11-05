import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartView } from "@/components/shop/cart-view";
import { getCatalog } from "@/lib/catalog";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getSettings } from "@/lib/orders";
import { accountsEnabled } from "@/lib/supabase/config";

// Product list is refreshed at most every minute (admin changes revalidate it immediately).
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[lang]/cart">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).cart.metaTitle, robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const accounts = accountsEnabled();
  const [categories, settings] = await Promise.all([getCatalog(), accounts ? getSettings() : Promise.resolve(null)]);

  return (
    <div className="min-h-[80svh] bg-petal pb-24">
      <div className="bg-gradient-to-b from-plum to-berry-deep pt-36 pb-14 text-ivory sm:pt-44">
        <h1 className="font-display mx-auto max-w-6xl px-5 text-5xl sm:px-8">{dict.cart.title}</h1>
      </div>
      <div className="mx-auto mt-10 max-w-6xl px-5 sm:px-8">
        <CartView products={categories.flatMap((c) => c.products)} accounts={accounts} freeShippingThreshold={settings?.freeShippingThreshold ?? null} />
      </div>
    </div>
  );
}
