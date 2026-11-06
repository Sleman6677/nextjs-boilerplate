import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowForward } from "@/components/icons";
import { OrderView } from "@/components/shop/order-view";
import { currentUser } from "@/lib/auth";
import { href, isLocale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { getOrderForUser } from "@/lib/orders";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/orders/[number]">): Promise<Metadata> {
  const { lang, number } = await params;
  if (!isLocale(lang)) return {};
  return { title: t(getDictionary(lang).store.order.title, { number }), robots: { index: false } };
}

export default async function AccountOrderPage({ params, searchParams }: PageProps<"/[lang]/account/orders/[number]">) {
  const { lang, number } = await params;
  if (!isLocale(lang) || !/^\d{1,12}$/.test(number)) notFound();
  const user = await currentUser();
  if (!user) redirect(href(lang, `/login?next=/${lang}/account/orders/${number}`));
  const order = await getOrderForUser(user.id, Number(number));
  if (!order) notFound();
  const q = await searchParams;
  return (
    <div className="space-y-6">
      <Link href={href(lang, "/account")} className="group inline-flex min-h-11 items-center gap-2 text-sm text-cocoa">
        <ArrowForward className="h-4 w-4 rotate-180" /> {getDictionary(lang).account.back}
      </Link>
      <OrderView order={order} lang={lang} signedIn flags={{ isNew: Boolean(q.new), paid: Boolean(q.paid), failed: Boolean(q.failed), payError: Boolean(q.payerror) }} />
    </div>
  );
}
