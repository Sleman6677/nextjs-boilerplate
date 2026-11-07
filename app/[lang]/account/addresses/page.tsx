import { SplitTitle } from "@/components/split-title";
import { notFound, redirect } from "next/navigation";
import { AddressBook } from "@/components/account/address-book";
import { listAddresses } from "@/lib/account";
import { currentUser } from "@/lib/auth";
import { href, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function AddressesPage({ params }: PageProps<"/[lang]/account/addresses">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await currentUser();
  if (!user) redirect(href(lang, `/login?next=/${lang}/account/addresses`));
  const dict = getDictionary(lang);
  return (
    <section>
      <SplitTitle className="font-naskh mb-6 text-3xl text-cocoa" text={dict.account.nav.addresses} />
      <AddressBook addresses={await listAddresses(user.id)} />
    </section>
  );
}
