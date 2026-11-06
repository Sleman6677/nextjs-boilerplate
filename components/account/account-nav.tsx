"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { href } from "@/lib/i18n/config";
import { useI18n } from "../i18n-provider";

export function AccountNav() {
  const { lang, dict } = useI18n();
  const pathname = usePathname();
  const n = dict.account.nav;
  const items = [
    { path: "/account", label: n.overview },
    { path: "/account/favorites", label: dict.store.account.favorites },
    { path: "/account/addresses", label: n.addresses },
    { path: "/account/profile", label: n.profile },
    { path: "/account/points", label: n.points },
    { path: "/cart", label: n.cart },
  ];
  return (
    <nav aria-label={dict.nav.account} className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
      <ul className="flex gap-2">
        {items.map((i) => {
          const full = href(lang, i.path);
          const active = i.path === "/account" ? pathname === full || pathname.startsWith(`${full}/orders`) : pathname.startsWith(full);
          return (
            <li key={i.path} className="shrink-0">
              <Link
                href={full}
                aria-current={active ? "page" : undefined}
                className="flex min-h-11 items-center rounded-full border border-gold/25 px-5 text-sm text-ivory/80 transition-colors hover:border-gold aria-[current=page]:border-gold aria-[current=page]:bg-gold aria-[current=page]:text-ink"
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
