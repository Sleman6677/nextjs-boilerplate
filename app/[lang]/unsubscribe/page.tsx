import { SplitTitle } from "@/components/split-title";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { unsubscribe } from "@/app/actions/account";
import { href, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Link at the end of every marketing SMS: one tap turns marketing messages off (order updates continue). */
export default async function UnsubscribePage({ params, searchParams }: PageProps<"/[lang]/unsubscribe">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await connection();
  const u = getDictionary(lang).store.unsubscribe;
  const token = (await searchParams).t;
  const result = typeof token === "string" ? await unsubscribe(token) : { ok: false };
  return (
    <section className="grid min-h-[70svh] place-items-center bg-petal px-5 pt-32 pb-20 text-center">
      <div className="max-w-md">
        <SplitTitle as="h1" className="font-display text-4xl text-plum" text={u.title} />
        <p className="mt-5 text-lg leading-8 text-berry-deep/85" role="status">
          {result.ok ? u.done : u.failed}
        </p>
        <Link href={href(lang, "/shop")} className="btn btn-berry mt-8">
          {u.back}
        </Link>
      </div>
    </section>
  );
}
