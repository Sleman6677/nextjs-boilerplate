"use client";

import { SplitTitle } from "@/components/split-title";
import { LashEye } from "@/components/art";
import { useI18n } from "@/components/i18n-provider";
import { ButtonLink } from "@/components/ui";
import { href } from "@/lib/i18n/config";

export default function NotFound() {
  const { lang, dict } = useI18n();
  return (
    <section className="relative flex min-h-[90svh] items-center overflow-clip bg-white pt-32 pb-20 text-inkwell">
      <div className="glow pointer-events-none absolute top-1/4 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 opacity-50" aria-hidden="true" />
      <div className="relative mx-auto max-w-2xl px-5 text-center">
        <div className="mx-auto w-56 text-gold-soft">
          <LashEye style="classic" map="doll" draw baseDelay={200} />
        </div>
        <p className="font-display lining text-gold-grad mt-8 text-7xl" dir="ltr">
          404
        </p>
        <SplitTitle as="h1" className="font-display mt-4 text-4xl leading-snug sm:text-5xl" text={dict.notFound.title} />
        <p className="mt-5 text-lg text-taupe">{dict.notFound.lead}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href={href(lang, "/")}>{dict.notFound.home}</ButtonLink>
          <ButtonLink href={href(lang, "/booking")} variant="ghost-dark" arrow={false}>
            {dict.nav.book}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
