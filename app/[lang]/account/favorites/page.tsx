import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FavoritesList } from "@/components/account/favorites-list";
import { getStore } from "@/lib/catalog";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/favorites">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).store.account.favorites, robots: { index: false } };
}

export default async function FavoritesPage({ params }: PageProps<"/[lang]/account/favorites">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const store = await getStore();
  return (
    <section>
      <h2 className="font-naskh mb-6 text-3xl text-cocoa">{getDictionary(lang).store.account.favorites}</h2>
      <FavoritesList products={[...store.all.values()]} offers={store.offers} />
    </section>
  );
}
