import Link from "next/link";
import { href, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { navItems, site, whatsappLink } from "@/lib/site";
import { LashDivider, Monogram } from "./art";
import { CountdownInline } from "./countdown";
import { Clock, Instagram, Phone, Pin, Sparkle, TikTok, WhatsApp } from "./icons";

export function AnnouncementBar({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  return (
    <div className="relative z-[51] flex h-9 items-center justify-center gap-3 overflow-hidden bg-ink px-4 text-[0.8rem] text-gold-soft sm:h-10 sm:text-sm">
      <Sparkle className="hidden h-3 w-3 text-gold sm:block" />
      <p className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
        <span className="hidden font-semibold text-ivory sm:inline">{dict.announcement.label}:</span>
        <span className="sm:hidden">{dict.announcement.short}</span>
        <span className="hidden sm:inline">{dict.announcement.headline}</span>
        <span className="text-gold/50" aria-hidden="true">
          |
        </span>
        <span className="hidden sm:inline">{dict.announcement.endsIn}</span>
        <CountdownInline />
      </p>
      <Link href={href(lang, "/booking")} className="link-line hidden shrink-0 text-ivory md:inline">
        {dict.announcement.bookNow}
      </Link>
    </div>
  );
}

export function WhatsAppFloat({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  return (
    <a
      href={whatsappLink(t(dict.common.waHello, { brand: dict.brand }))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={dict.common.waLabel}
      className="pulse-ring fixed end-5 bottom-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-ink text-gold-soft shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] ring-1 ring-gold/40 transition-transform duration-300 hover:-translate-y-1 hover:text-ivory sm:end-8 sm:bottom-8"
    >
      <WhatsApp className="h-6 w-6" />
    </a>
  );
}

export function Footer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const year = new Date().getFullYear();
  const links = [...navItems.map((i) => ({ path: i.href, label: dict.nav[i.key] })), { path: "/booking", label: dict.nav.book }];

  return (
    <footer className="relative overflow-clip bg-ink text-ivory">
      <div className="glow pointer-events-none absolute -bottom-60 right-1/2 h-[40rem] w-[40rem] translate-x-1/2 opacity-40" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 pt-24 sm:px-8">
        <div className="grid gap-14 border-b border-gold/15 pb-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Monogram className="h-14 w-14 text-gold" />
            <p className="font-display mt-6 max-w-xs text-2xl leading-relaxed text-ivory/90">{dict.footer.tagline}</p>
            <div className="mt-8 flex gap-3">
              {[
                { href: `https://instagram.com/${site.instagram}`, label: dict.common.instagram, icon: <Instagram /> },
                { href: `https://www.tiktok.com/@${site.tiktok}`, label: dict.common.tiktok, icon: <TikTok /> },
                { href: whatsappLink(), label: dict.common.whatsapp, icon: <WhatsApp className="h-5 w-5" /> },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid h-11 w-11 place-items-center rounded-full border border-gold/25 text-gold-soft transition-colors duration-200 hover:border-gold hover:bg-gold hover:text-ink"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <nav aria-label={dict.footer.links}>
            <h2 className="eyebrow text-gold" dir="ltr">
              Explore
            </h2>
            <ul className="mt-6 space-y-3 text-ivory/75">
              {links.map((item) => (
                <li key={item.path}>
                  <Link href={href(lang, item.path)} className="link-line transition-colors duration-200 hover:text-gold-soft">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow text-gold" dir="ltr">
              Visit
            </h2>
            <ul className="mt-6 space-y-4 text-ivory/75">
              <li className="flex gap-3">
                <Pin className="mt-1 shrink-0 text-gold" />
                {dict.footer.location}
              </li>
              <li className="flex gap-3">
                <Phone className="mt-1 shrink-0 text-gold" />
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" dir="ltr" className="link-line hover:text-gold-soft">
                  {site.phoneDisplay}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="eyebrow text-gold" dir="ltr">
              Hours
            </h2>
            <ul className="mt-6 space-y-4 text-ivory/75">
              {dict.footer.hours.map((h) => (
                <li key={h.days} className="flex gap-3">
                  <Clock className="mt-1 shrink-0 text-gold" />
                  <span>
                    <span className="block text-ivory">{h.days}</span>
                    {h.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative py-10">
          <p
            className="font-display pointer-events-none text-center text-[19vw] leading-[0.8] text-transparent italic select-none [-webkit-text-stroke:1px_rgba(201,164,92,0.35)] lg:text-[15rem]"
            dir="ltr"
            aria-hidden="true"
          >
            Serag
          </p>
          <LashDivider className="mx-auto -mt-2 w-56 text-gold/70" />
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-gold/15 py-8 text-sm text-ivory/60 sm:flex-row">
          <p>
            © {year} {dict.brand === site.name ? site.name : `${dict.brand} · ${site.name}`}. {dict.footer.rights}
          </p>
          <p className="font-display tracking-[0.3em]" dir="ltr">
            CRAFTED BY HAND
          </p>
        </div>
      </div>
    </footer>
  );
}
