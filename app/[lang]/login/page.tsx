import { SplitTitle } from "@/components/split-title";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LoginForm } from "@/components/account/login-form";
import { Check } from "@/components/icons";
import { currentUser } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { safeNext } from "@/lib/safe-next";
import { accountsEnabled } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).auth.metaTitle, robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const a = getDictionary(lang).auth;
  const next = safeNext((await searchParams).next, lang);
  if (await currentUser()) redirect(next);

  return (
    <section className="relative overflow-clip bg-transparent pt-36 pb-24 sm:pt-44">
      <div className="glow pointer-events-none absolute -top-40 left-[-10%] h-[36rem] w-[36rem] opacity-60" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-5xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="text-inkwell">
          <SplitTitle as="h1" className="font-display mt-6 text-5xl leading-tight" text={a.title} />
          <p className="mt-5 text-lg leading-8 text-taupe">{getDictionary(lang).store.login.text}</p>
          <ul className="mt-8 space-y-3 text-taupe">
            {a.perks.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-ember text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        {accountsEnabled() ? <LoginForm next={next} /> : <p className="rounded-none border border-mist-gray bg-surface p-8 text-graphite">{a.unavailable}</p>}
      </div>
    </section>
  );
}
