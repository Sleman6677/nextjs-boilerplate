import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Wordmark } from "@/components/art";
import { getDashboard } from "@/lib/admin";
import { currentUser, staffUser } from "@/lib/auth";
import { accountsEnabled } from "@/lib/supabase/config";
import { fontVariables } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { template: "%s · لوحة Serag", default: "لوحة التحكم · Serag Lashes" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#14100e" };

const signOutAction = signOut.bind(null, "ar");

function Gate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-5 text-ivory">
      <div className="max-w-md text-center">
        <Wordmark />
        <h1 className="font-naskh mt-10 text-3xl">{title}</h1>
        <div className="mt-4 text-ivory/70">{children}</div>
      </div>
    </main>
  );
}

async function Shell({ children }: { children: ReactNode }) {
  if (!accountsEnabled()) {
    return (
      <Gate title="اللوحة غير مفعّلة بعد">
        <p>تعمل لوحة التحكم بعد ربط قاعدة بيانات Supabase وإضافة متغيرات البيئة. الخطوات موجودة في ملف README.</p>
      </Gate>
    );
  }
  const user = await currentUser();
  if (!user) redirect("/ar/login?next=/admin");
  const staff = await staffUser();
  if (!staff) {
    return (
      <Gate title="لا توجد صلاحية دخول">
        <p>
          الحساب <span dir="ltr">{user.email ?? user.phone}</span> ليس من حسابات الطاقم. يضيفه صاحب المتجر من «الطاقم» في اللوحة.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/ar" className="btn btn-ghost-light min-h-11 px-5 text-sm">
            إلى الموقع
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-gold min-h-11 px-5 text-sm">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </Gate>
    );
  }

  const stats = await getDashboard();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[70] focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-ink">
        تخطَّ إلى المحتوى
      </a>
      <aside className="bg-ink px-4 pt-5 pb-4 text-ivory lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:px-5 lg:py-8">
        <div className="mb-5 flex items-center justify-between gap-3 lg:mb-8 lg:block">
          <Link href="/admin" aria-label="نظرة عامة">
            <Wordmark />
          </Link>
          <form action={signOutAction} className="lg:hidden">
            <button type="submit" className="min-h-11 rounded-full border border-gold/30 px-4 text-xs text-ivory/80">
              خروج
            </button>
          </form>
        </div>
        <AdminNav newOrders={stats.toPrepare} permissions={staff.permissions} />
        <div className="mt-auto hidden border-t border-gold/15 pt-5 text-sm lg:block">
          <Link href="/ar/shop" target="_blank" className="flex min-h-11 items-center text-gold-soft hover:text-gold">
            عرض المتجر ↗
          </Link>
          <p className="mt-2 truncate text-xs text-ivory/50" dir="ltr">
            {staff.name}
          </p>
          <form action={signOutAction} className="mt-3">
            <button type="submit" className="min-h-11 text-ivory/70 hover:text-ivory">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>
      <main id="admin-main" className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="ar" dir="rtl" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-cream">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
