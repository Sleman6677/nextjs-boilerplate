import { SplitTitle } from "@/components/split-title";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { CheckoutForm, type CheckoutProfile } from "@/components/shop/checkout-form";
import { getProfile, listAddresses } from "@/lib/account";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/catalog";
import { href, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { listZones } from "@/lib/orders";
import { payplusMethods } from "@/lib/payplus";
import { payments } from "@/lib/site";
import { accountsEnabled } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/checkout">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).store.checkout.title, robots: { index: false } };
}

/** Guest checkout: no sign-in needed; the phone number becomes the customer's account. */
export default async function CheckoutPage({ params }: PageProps<"/[lang]/checkout">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  if (!accountsEnabled()) redirect(href(lang, "/cart"));
  await connection();
  const user = await currentUser();
  const dict = getDictionary(lang);
  const [store, zones, addresses, p] = await Promise.all([getStore(), listZones(), user ? listAddresses(user.id) : Promise.resolve([]), user ? getProfile(user.id) : Promise.resolve(null)]);
  const profile: CheckoutProfile = p ? { fullName: p.fullName, phone: p.phone, email: p.email, birthday: p.birthday, marketingConsent: p.marketingConsent } : null;
  const online = payplusMethods();

  return (
    <div className="min-h-[80svh] bg-petal pb-24">
      <div className="bg-transparent border-b border-mist-gray pt-36 pb-14 text-inkwell sm:pt-44">
        <SplitTitle as="h1" className="font-display mx-auto max-w-6xl px-5 text-5xl sm:px-8 sm:text-7xl" text={dict.store.checkout.title} />
      </div>
      <div className="mx-auto mt-10 max-w-6xl px-5 sm:px-8">
        <CheckoutForm
          products={[...store.all.values()]}
          zones={zones}
          addresses={addresses}
          profile={profile}
          methods={{ card: online.includes("card"), apple_pay: online.includes("apple_pay"), bitOnline: online.includes("bit") }}
          bitPhone={payments.bit.display}
        />
      </div>
    </div>
  );
}
