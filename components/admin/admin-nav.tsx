"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Permission } from "@/lib/auth";

const GROUPS: { title: string; items: { href: string; label: string; perm?: Permission }[] }[] = [
  {
    title: "اليومي",
    items: [
      { href: "/admin", label: "نظرة عامة" },
      { href: "/admin/orders", label: "الطلبات", perm: "orders" },
      { href: "/admin/customers", label: "الزبائن", perm: "customers" },
    ],
  },
  {
    title: "المتجر",
    items: [
      { href: "/admin/products", label: "المنتجات", perm: "products" },
      { href: "/admin/inventory", label: "المخزون", perm: "products" },
      { href: "/admin/categories", label: "المجموعات", perm: "products" },
      { href: "/admin/reviews", label: "التقييمات", perm: "products" },
    ],
  },
  {
    title: "التسويق",
    items: [
      { href: "/admin/offers", label: "العروض والتخفيضات", perm: "marketing" },
      { href: "/admin/coupons", label: "الكوبونات", perm: "marketing" },
      { href: "/admin/gift-cards", label: "بطاقات الهدية", perm: "marketing" },
      { href: "/admin/messages", label: "الرسائل", perm: "marketing" },
      { href: "/admin/carts", label: "السلات المتروكة", perm: "marketing" },
    ],
  },
  {
    title: "التقارير",
    items: [
      { href: "/admin/reports", label: "المبيعات", perm: "reports" },
      { href: "/admin/sources", label: "مصادر الطلبات", perm: "reports" },
    ],
  },
  {
    title: "الإدارة",
    items: [
      { href: "/admin/shipping", label: "الشحن", perm: "settings" },
      { href: "/admin/settings", label: "الإعدادات", perm: "settings" },
      { href: "/admin/staff", label: "الطاقم والسجل", perm: "staff" },
    ],
  },
];

export function AdminNav({ newOrders, permissions }: { newOrders: number; permissions: Permission[] }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || permissions.includes(i.perm)) })).filter((g) => g.items.length);
  return (
    <nav aria-label="أقسام اللوحة" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0">
      <div className="flex gap-2 lg:block lg:space-y-5">
        {groups.map((g) => (
          <div key={g.title} className="contents lg:block">
            <p className="hidden px-4 pb-1 text-[0.7rem] font-semibold tracking-wide text-gold/70 lg:block">{g.title}</p>
            <ul className="contents lg:flex lg:flex-col lg:gap-0.5">
              {g.items.map((item) => (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active(item.href) ? "page" : undefined}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-full border border-gold/20 px-4 text-sm whitespace-nowrap text-ivory/75 transition-colors duration-200 hover:text-gold-soft aria-[current=page]:border-gold aria-[current=page]:bg-gold aria-[current=page]:text-ink lg:min-h-10 lg:rounded-2xl lg:border-transparent lg:aria-[current=page]:border-transparent"
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
          </div>
        ))}
      </div>
    </nav>
  );
}
