"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { nav, site, whatsappLink } from "@/lib/site";
import { Wordmark } from "./art";
import { ArrowForward, Close, Instagram, Menu, WhatsApp } from "./icons";

export function Header() {
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
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={`fixed inset-x-0 z-50 transition-[top] duration-500 ease-[var(--ease-silk)] ${scrolled ? "top-3" : "top-9 sm:top-10"}`}
    >
      <div
        className={`mx-auto transition-all duration-500 ease-[var(--ease-silk)] ${
          scrolled ? "max-w-6xl px-3 sm:px-6" : "max-w-7xl px-0"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-6 transition-all duration-500 ${
            scrolled
              ? "rounded-full border border-gold/20 bg-ink/80 px-4 py-2.5 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:px-6"
              : "px-5 py-4 sm:px-8"
          }`}
        >
          <Link href="/" aria-label={`${site.name} — الصفحة الرئيسية`} className="shrink-0">
            <Wordmark />
          </Link>

          <nav aria-label="التنقل الرئيسي" className="hidden lg:block">
            <ul className="flex items-center gap-9 text-[0.95rem] text-ivory/85">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="link-line transition-colors duration-200 hover:text-gold-soft aria-[current=page]:text-gold-soft"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/booking" className="btn btn-gold hidden min-h-11 px-6 py-2 text-sm sm:inline-flex">
              احجزي موعدك
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-full border border-gold/30 text-ivory transition-colors duration-200 hover:border-gold lg:hidden"
              aria-label="فتح القائمة"
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
        aria-label="القائمة"
        className={`fixed inset-0 z-50 flex flex-col bg-ink text-ivory transition-[opacity,visibility] duration-500 lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="glow pointer-events-none absolute -bottom-40 -left-40 h-[30rem] w-[30rem] opacity-50" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <Wordmark />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-11 w-11 place-items-center rounded-full border border-gold/30"
            aria-label="إغلاق القائمة"
          >
            <Close />
          </button>
        </div>
        <nav aria-label="قائمة الجوال" className="relative flex flex-1 flex-col justify-center px-8">
          <ul className="space-y-2">
            {[...nav, { href: "/booking", label: "احجزي موعدك" }].map((item, i) => (
              <li
                key={item.href}
                className={`transition-all duration-700 ease-[var(--ease-expo)] ${open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
                style={{ transitionDelay: open ? `${120 + i * 70}ms` : "0ms" } as CSSProperties}
              >
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="font-display group flex items-center justify-between border-b border-gold/15 py-4 text-3xl aria-[current=page]:text-gold-soft"
                >
                  {item.label}
                  <ArrowForward className="h-5 w-5 text-gold transition-transform duration-300 group-hover:-translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="relative flex items-center gap-4 px-8 pb-10 text-gold-soft">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2">
            <WhatsApp /> واتساب
          </a>
          <span className="h-4 w-px bg-gold/30" aria-hidden="true" />
          <a href={`https://instagram.com/${site.instagram}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2">
            <Instagram /> إنستغرام
          </a>
        </div>
      </div>
    </header>
  );
}
