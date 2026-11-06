import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowForward, Sparkle } from "./icons";
import { Reveal } from "./reveal";

/** Splits a headline into words that rise out of a mask on load. */
export function Rise({ text, start = 0, className }: { text: string; start?: number; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={`rise ${className ?? ""}`}>
      {words.map((word, i) => (
        <span className="w" key={`${word}-${i}`}>
          <span style={{ "--i": start + i } as CSSProperties}>{word}</span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}

export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={i} className="flex items-center">
          <span className="px-8 whitespace-nowrap">{item}</span>
          <Sparkle className="h-3 w-3 shrink-0 text-gold" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`marquee ${className ?? ""}`}>
      <div className="marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  tone = "dark",
  align = "start",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  tone?: "dark" | "light";
  align?: "start" | "center";
  className?: string;
}) {
  const light = tone === "light";
  return (
    <header className={`${align === "center" ? "mx-auto text-center" : ""} max-w-2xl ${className ?? ""}`}>
      <Reveal as="p" className={`eyebrow ${light ? "text-gold" : "text-gold-deep"} ${align === "center" ? "justify-center" : ""} flex items-center gap-3`}>
        <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
        <span dir="ltr">{eyebrow}</span>
      </Reveal>
      <Reveal as="h2" delay={80} className={`font-display mt-5 text-[2.1rem] leading-[1.3] sm:text-5xl sm:leading-[1.25] ${light ? "text-ivory" : "text-cocoa"}`}>
        {title}
      </Reveal>
      {lead ? (
        <Reveal as="p" delay={160} className={`mt-5 text-lg leading-8 ${light ? "text-ivory/75" : "text-taupe"}`}>
          {lead}
        </Reveal>
      ) : null}
    </header>
  );
}

type ButtonVariant = "gold" | "ink" | "ghost-light" | "ghost-dark";

export function ButtonLink({
  href,
  children,
  variant = "gold",
  arrow = true,
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  arrow?: boolean;
  className?: string;
  external?: boolean;
}) {
  const cls = `btn btn-${variant} group ${className ?? ""}`;
  const content = (
    <>
      <span>{children}</span>
      {arrow ? <ArrowForward className="transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" /> : null}
    </>
  );
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

/** Small page hero used by inner pages. */
export function PageHero({
  eyebrow,
  title,
  lead,
  art,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  art?: ReactNode;
}) {
  return (
    <section className="relative overflow-clip bg-ink pt-40 pb-20 text-ivory sm:pt-48 sm:pb-28">
      <div className="glow pointer-events-none absolute -top-40 left-[-10%] h-[36rem] w-[36rem] opacity-60" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl items-end gap-12 px-5 sm:px-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow fade-in flex items-center gap-3 text-gold">
            <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
            <span dir="ltr">{eyebrow}</span>
          </p>
          <h1 className="font-display mt-6 text-[2.6rem] leading-[1.25] sm:text-6xl sm:leading-[1.2]">
            <Rise text={title} />
          </h1>
          <p className="fade-in mt-6 max-w-xl text-lg leading-8 text-ivory/75" style={{ "--d": "500ms" } as CSSProperties}>
            {lead}
          </p>
        </div>
        {art ? <div className="relative hidden lg:block">{art}</div> : null}
      </div>
    </section>
  );
}
