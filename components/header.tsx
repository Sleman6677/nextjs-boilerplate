"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { useEffect, useState, type CSSProperties } from "react";
import { href, localeNames, locales, localeShort, switchLocalePath } from "@/lib/i18n/config";
import { navItems, whatsappLink } from "@/lib/site";
import { Wordmark } from "./art";
import { useI18n } from "./i18n-provider";
import { useCartCount } from "./cart-store";
import { ArrowForward, Bag, Close, Heart, Instagram, Menu, TikTok, User, WhatsApp } from "./icons";
import { num, t } from "@/lib/i18n/format";

function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, dict } = useI18n();
  const pathname = usePathname();
  return (
    <div role="group" aria-label={dict.nav.language} className={`flex items-center rounded-full border border-graphite/15 p-0.5 ${className ?? ""}`}>
      {locales.map((l) => (
        <Link
          key={l}
          href={switchLocalePath(pathname, l)}
          hrefLang={l}
          lang={l}
          prefetch={false}
          aria-current={l === lang ? "true" : undefined}
          aria-label={localeNames[l]}
          className="grid h-9 min-w-9 place-items-center rounded-full px-2 text-xs font-semibold text-taupe transition-colors duration-200 hover:text-ember aria-[current=true]:bg-ink aria-[current=true]:text-white"
        >
          {localeShort[l]}
        </Link>
      ))}
    </div>
  );
}

export function Header({ accounts = false, social }: { accounts?: boolean; social: { instagram: string; tiktok: string; whatsapp: string } }) {
  const { lang, dict } = useI18n();
  const count = useCartCount();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu on navigation (state adjusted during render, per React guidance).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Lock page scroll while the menu is open; Escape closes it.
  const lenis = useLenis();
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    // Lenis scrolls programmatically, so overflow:hidden alone doesn't stop it.
    if (open) lenis?.stop();
    else lenis?.start();
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lenis]);

  const isActive = (path: string) => {
    const full = href(lang, path);
    return path === "/" ? pathname === full : pathname.startsWith(full);
  };
  const links = navItems.map((item) => ({ path: item.href, label: dict.nav[item.key] }));

  return (
    <header className={`fixed inset-x-0 z-50 transition-[top] duration-500 ease-[var(--ease-silk)] ${scrolled ? "top-3" : "top-9 sm:top-10"}`}>
      <div className={`mx-auto transition-[max-width,padding] duration-300 ease-[var(--ease-expo)] ${scrolled ? "max-w-6xl px-3 sm:px-6" : "max-w-7xl px-0"}`}>
        <div
          className={`flex items-center justify-between gap-4 transition-[padding,background-color,border-color] duration-300 ${
            scrolled
              ? "rounded-[12px] bg-stone/95 px-4 py-2.5 ring-1 ring-line backdrop-blur-xl sm:px-6"
              : "px-5 py-4 sm:px-8"
          }`}
        >
          <Link href={href(lang, "/")} aria-label={dict.nav.homeLabel} className="shrink-0">
            <Wordmark tone="dark" />
          </Link>

          <nav aria-label={dict.nav.mainNav} className="hidden lg:block">
            <ul className="flex items-center gap-7 text-sm font-semibold text-inkwell">
              {links.map((item) => (
                <li key={item.path}>
                  <Link
                    href={href(lang, item.path)}
                    aria-current={isActive(item.path) ? "page" : undefined}
                    className="py-3 underline-offset-4 hover:underline aria-[current=page]:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden md:flex" />
            <Link href={href(lang, "/account/favorites")} aria-label={dict.store.nav.favorites} className="hidden h-11 w-11 place-items-center rounded-full border border-graphite/15 text-inkwell transition-colors duration-200 hover:border-graphite sm:grid">
              <Heart className="h-5 w-5" />
            </Link>
            {accounts ? (
              <Link href={href(lang, "/account")} aria-label={dict.nav.account} className="hidden h-11 w-11 place-items-center rounded-full border border-graphite/15 text-inkwell transition-colors duration-200 hover:border-graphite sm:grid">
                <User />
              </Link>
            ) : null}
            <Link href={href(lang, "/cart")} aria-label={t(dict.cart.label, { count: num(count, lang) })} className="relative grid h-11 w-11 place-items-center rounded-full border border-graphite/15 text-inkwell transition-colors duration-200 hover:border-graphite">
              <Bag className="h-5 w-5" />
              {count > 0 ? (
                <span key={count} className="pop absolute -top-1 -end-1 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-[0.6rem] font-semibold text-ink">
                  {num(count, lang)}
                </span>
              ) : null}
            </Link>
            <Link href={href(lang, "/shop")} className="btn btn-gold hidden min-h-11 px-6 py-2 text-sm lg:inline-flex">
              {dict.store.home.cta}
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-full border border-graphite/15 text-inkwell transition-colors duration-200 hover:border-graphite lg:hidden"
              aria-label={dict.nav.openMenu}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <Menu />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={dict.nav.menu}
        className={`fixed inset-0 z-50 flex flex-col bg-ink text-ivory transition-[opacity,visibility] duration-500 lg:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        <div className="glow pointer-events-none absolute -bottom-40 -left-40 h-[30rem] w-[30rem] opacity-50" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <Wordmark />
          <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full border border-gold/30" aria-label={dict.nav.closeMenu}>
            <Close />
          </button>
        </div>
        <nav aria-label={dict.nav.mobileNav} className="relative flex flex-1 flex-col justify-center px-8">
          <ul className="space-y-2">
            {[...links, { path: "/account/favorites", label: dict.store.nav.favorites }, ...(accounts ? [{ path: "/account", label: dict.nav.account }] : [])].map((item, i) => (
              <li
                key={item.path}
                className={`transition-[transform,opacity] duration-300 ease-[var(--ease-expo)] ${open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
                style={{ transitionDelay: open ? `${120 + i * 70}ms` : "0ms" } as CSSProperties}
              >
                <Link
                  href={href(lang, item.path)}
                  aria-current={isActive(item.path) ? "page" : undefined}
                  className="font-display group flex items-center justify-between border-b border-gold/15 py-4 text-3xl aria-[current=page]:text-gold-soft"
                >
                  {item.label}
                  <ArrowForward className="h-5 w-5 text-gold transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="relative flex flex-wrap items-center gap-4 px-8 pb-10 text-gold-soft">
          <LanguageSwitcher />
          <a href={whatsappLink(undefined, social.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2">
            <WhatsApp /> {dict.common.whatsapp}
          </a>
          <a href={`https://instagram.com/${social.instagram}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2">
            <Instagram /> {dict.common.instagram}
          </a>
          <a href={`https://www.tiktok.com/@${social.tiktok}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2">
            <TikTok /> {dict.store.social.tiktok}
          </a>
        </div>
      </div>
    </header>
  );
}
