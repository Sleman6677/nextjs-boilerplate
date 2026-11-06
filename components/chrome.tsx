import Link from "next/link";
import { href, type Locale } from "@/lib/i18n/config";
import { localized, money, t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { navItems, site, whatsappLink } from "@/lib/site";
import type { StoreInfo } from "@/lib/social";
import { LashDivider, Monogram } from "./art";
import { Instagram, Phone, Sparkle, TikTok, WhatsApp } from "./icons";

export function AnnouncementBar({ lang, info }: { lang: Locale; info: StoreInfo }) {
  const dict = getDictionary(lang);
  const perk = dict.store.home.perks[0];
  const text = info.announcement
    ? localized(info.announcement, lang)
    : info.freeShippingThreshold !== null
      ? `${perk.title} ${t(perk.text, { amount: money(info.freeShippingThreshold, lang) })}`
      : dict.store.home.eyebrow;
  return (
    <div className="relative z-[51] flex h-9 items-center justify-center gap-3 overflow-hidden bg-ink px-4 text-[0.8rem] text-gold-soft sm:h-10 sm:text-sm">
      <Sparkle className="h-3 w-3 shrink-0 text-gold" />
      <p className="truncate">{text}</p>
      <Link href={href(lang, "/shop")} className="link-line hidden shrink-0 text-ivory md:inline">
        {dict.store.home.cta}
      </Link>
    </div>
  );
}

export function WhatsAppFloat({ lang, info }: { lang: Locale; info: StoreInfo }) {
  const dict = getDictionary(lang);
  return (
    <a
      href={whatsappLink(t(dict.common.waHello, { brand: dict.brand }), info.whatsapp)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={dict.common.waLabel}
      className="pulse-ring fixed end-5 bottom-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-ink text-gold-soft shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] ring-1 ring-gold/40 transition-transform duration-300 hover:-translate-y-1 hover:text-ivory sm:end-8 sm:bottom-8"
    >
      <WhatsApp className="h-6 w-6" />
    </a>
  );
}

export function socialLinks(info: StoreInfo, lang: Locale) {
  const dict = getDictionary(lang);
  return [
    { key: "instagram", href: `https://instagram.com/${info.instagram}`, label: dict.store.social.instagram, icon: <Instagram /> },
    { key: "whatsapp", href: whatsappLink(undefined, info.whatsapp), label: dict.store.social.whatsapp, icon: <WhatsApp className="h-5 w-5" /> },
    { key: "tiktok", href: `https://www.tiktok.com/@${info.tiktok}`, label: dict.store.social.tiktok, icon: <TikTok /> },
  ];
}

export function Footer({ lang, info }: { lang: Locale; info: StoreInfo }) {
  const dict = getDictionary(lang);
  const year = new Date().getFullYear();
  const links = [
    ...navItems.map((i) => ({ path: i.href, label: dict.nav[i.key] })),
    { path: "/shop#gift-cards", label: dict.store.nav.giftCards },
    { path: "/account", label: dict.store.nav.account },
    { path: "/account/favorites", label: dict.store.nav.favorites },
  ];
  const phone = `+${info.whatsapp.slice(0, 3)} ${info.whatsapp.slice(3, 5)} ${info.whatsapp.slice(5, 8)} ${info.whatsapp.slice(8)}`;

  return (
    <footer className="relative overflow-clip bg-ink text-ivory">
      <div className="glow pointer-events-none absolute -bottom-60 right-1/2 h-[40rem] w-[40rem] translate-x-1/2 opacity-40" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 pt-24 sm:px-8">
        <div className="grid gap-14 border-b border-gold/15 pb-16 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Monogram className="h-14 w-14 text-gold" />
            <p className="font-display mt-6 max-w-xs text-2xl leading-relaxed text-ivory/90">{dict.footer.tagline}</p>
            <div className="mt-8 flex gap-3">
              {socialLinks(info, lang).map((s) => (
                <a
                  key={s.key}
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
              Contact
            </h2>
            <ul className="mt-6 space-y-4 text-ivory/75">
              <li className="flex gap-3">
                <WhatsApp className="mt-1 h-5 w-5 shrink-0 text-gold" />
                <a href={whatsappLink(undefined, info.whatsapp)} target="_blank" rel="noopener noreferrer" className="link-line hover:text-gold-soft">
                  {dict.store.social.chat}
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-1 shrink-0 text-gold" />
                <a href={`tel:+${info.whatsapp}`} dir="ltr" className="link-line hover:text-gold-soft">
                  {phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Instagram className="mt-1 shrink-0 text-gold" />
                <a href={`https://instagram.com/${info.instagram}`} target="_blank" rel="noopener noreferrer" dir="ltr" className="link-line hover:text-gold-soft">
                  @{info.instagram}
                </a>
              </li>
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
