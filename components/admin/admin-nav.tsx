"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/orders", label: "الطلبات" },
  { href: "/admin/products", label: "المنتجات" },
  { href: "/admin/categories", label: "المجموعات" },
  { href: "/admin/coupons", label: "الكوبونات" },
  { href: "/admin/customers", label: "الزبائن" },
  { href: "/admin/settings", label: "التوصيل والنقاط" },
];

export function AdminNav({ newOrders }: { newOrders: number }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  return (
    <nav aria-label="أقسام اللوحة" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-2 lg:flex-col lg:gap-1">
        {ITEMS.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className="flex min-h-11 items-center justify-between gap-3 rounded-full border border-gold/20 px-4 text-sm whitespace-nowrap text-ivory/75 transition-colors duration-200 hover:text-gold-soft aria-[current=page]:border-gold aria-[current=page]:bg-gold aria-[current=page]:text-ink lg:rounded-2xl lg:border-transparent lg:py-2.5 lg:aria-[current=page]:border-transparent"
            >
              {item.label}
              {item.href === "/admin/orders" && newOrders > 0 ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1.5 text-[0.7rem] font-bold text-ink" aria-label={`${newOrders} بحاجة لتجهيز`}>
                  {newOrders}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
