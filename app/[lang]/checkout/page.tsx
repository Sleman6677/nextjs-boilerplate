import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { getProfile, listAddresses } from "@/lib/account";
import { currentUser, ensureProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { href, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getSettings, pointsBalance } from "@/lib/orders";
import { payplusMethods } from "@/lib/payplus";
import { payments } from "@/lib/site";
import { accountsEnabled } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/checkout">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).pay.metaTitle, robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[lang]/checkout">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  if (!accountsEnabled()) redirect(href(lang, "/shop"));
  const user = await currentUser();
  if (!user) redirect(href(lang, `/login?next=/${lang}/checkout`));
  await ensureProfile(user, lang);

  const dict = getDictionary(lang);
  const [categories, addresses, profile, settings, balance] = await Promise.all([getCatalog(), listAddresses(user.id), getProfile(user.id), getSettings(), pointsBalance(user.id)]);
  const online = payplusMethods();

  return (
    <div className="min-h-[80svh] bg-petal pb-24">
      <div className="bg-gradient-to-b from-plum to-berry-deep pt-36 pb-14 text-ivory sm:pt-44">
        <h1 className="font-display mx-auto max-w-6xl px-5 text-5xl sm:px-8">{dict.pay.title}</h1>
      </div>
      <div className="mx-auto mt-10 max-w-6xl px-5 sm:px-8">
        <CheckoutForm
          products={categories.flatMap((c) => c.products)}
          addresses={addresses}
          profile={{ fullName: profile?.fullName ?? "", phone: profile?.phone ?? "" }}
          balance={balance}
          pointValue={settings.pointValue}
          methods={{ card: online.includes("card"), apple_pay: online.includes("apple_pay"), bitOnline: online.includes("bit") }}
          bitPhone={payments.bit.display}
        />
      </div>
    </div>
  );
}
