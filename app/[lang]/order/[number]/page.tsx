import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { OrderView } from "@/components/shop/order-view";
import { currentUser } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { checkOrderToken } from "@/lib/order-link";
import { getOrderByNumber } from "@/lib/orders";

export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps<"/[lang]/order/[number]">): Promise<Metadata> {
  const { lang, number } = await params;
  if (!isLocale(lang)) return {};
  return { title: t(getDictionary(lang).store.order.title, { number }), robots: { index: false, follow: false } };
}

/** Order page reached from the confirmation SMS or right after checkout (signed link, no sign-in needed). */
export default async function OrderLinkPage({ params, searchParams }: PageProps<"/[lang]/order/[number]">) {
  const { lang, number } = await params;
  if (!isLocale(lang) || !/^\d{1,12}$/.test(number)) notFound();
  await connection();
  const q = await searchParams;
  const token = typeof q.t === "string" ? q.t : null;
  const order = await getOrderByNumber(Number(number));
  if (!order || !checkOrderToken(order.id, token)) notFound();
  const user = await currentUser();
  return (
    <div className="min-h-[80svh] bg-cream pb-24">
      <div className="bg-transparent border-b border-mist-gray pt-32 pb-10 sm:pt-40" />
      <div className="mx-auto mt-10 max-w-6xl px-5 sm:px-8">
        <OrderView order={order} lang={lang} token={token} signedIn={user?.id === order.userId} flags={{ isNew: Boolean(q.new), paid: Boolean(q.paid), failed: Boolean(q.failed), payError: Boolean(q.payerror) }} />
      </div>
    </div>
  );
}
