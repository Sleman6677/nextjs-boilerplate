import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { AccountNav } from "@/components/account/account-nav";
import { getProfile } from "@/lib/account";
import { currentUser } from "@/lib/auth";
import { href, isLocale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { displayPhone } from "@/lib/phone";
import { accountsEnabled } from "@/lib/supabase/config";

export default async function AccountLayout({ children, params }: LayoutProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  if (!accountsEnabled()) {
    return (
      <section className="min-h-[70svh] bg-ink px-5 pt-40 text-center text-ivory">
        <p className="mx-auto max-w-lg text-lg">{dict.auth.unavailable}</p>
      </section>
    );
  }
  const user = await currentUser();
  if (!user) redirect(href(lang, `/login?next=/${lang}/account`));
  const profile = await getProfile(user.id);
  const name = profile?.fullName || user.email?.split("@")[0] || "";
  const signOutAction = signOut.bind(null, lang);

  return (
    <div className="min-h-[80svh] bg-cream pb-24">
      <div className="relative overflow-clip bg-ink pt-36 pb-10 text-ivory sm:pt-44">
        <div className="glow pointer-events-none absolute -top-40 left-[-10%] h-[30rem] w-[30rem] opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-gold" dir="ltr">My Account</p>
              <h1 className="font-display mt-3 text-4xl sm:text-5xl">{t(dict.account.hello, { name })}</h1>
              <p className="mt-2 text-sm text-ivory/60" dir="ltr">{user.phone ? displayPhone(user.phone) : user.email}</p>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="btn btn-ghost-light min-h-11 px-5 text-sm">
                {dict.auth.signOut}
              </button>
            </form>
          </div>
          <div className="mt-8">
            <AccountNav />
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl px-5 sm:px-8">{children}</div>
    </div>
  );
}
