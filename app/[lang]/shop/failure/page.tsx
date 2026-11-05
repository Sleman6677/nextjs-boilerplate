import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderResult } from "@/components/order-result";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/shop/failure">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).orderResult.metaFail, robots: { index: false } };
}

export default async function Page({ params }: PageProps<"/[lang]/shop/failure">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <section className="relative isolate flex min-h-[90svh] items-center overflow-clip bg-gradient-to-b from-plum via-berry-deep to-berry px-5 pt-36 pb-24">
      <div className="glow-pink drift pointer-events-none absolute -top-32 right-[-10%] -z-10 h-[30rem] w-[30rem] opacity-60" aria-hidden="true" />
      <OrderResult kind="failure" />
    </section>
  );
}
