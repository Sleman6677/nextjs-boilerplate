import { SplitTitle } from "@/components/split-title";
import { notFound, redirect } from "next/navigation";
import { ProfileForm } from "@/components/account/profile-form";
import { getProfile } from "@/lib/account";
import { currentUser } from "@/lib/auth";
import { href, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function ProfilePage({ params }: PageProps<"/[lang]/account/profile">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await currentUser();
  if (!user) redirect(href(lang, `/login?next=/${lang}/account/profile`));
  const profile = await getProfile(user.id);
  if (!profile) notFound();
  return (
    <section>
      <SplitTitle className="font-naskh mb-6 text-3xl text-cocoa" text={getDictionary(lang).account.nav.profile} />
      <ProfileForm profile={profile} />
    </section>
  );
}
