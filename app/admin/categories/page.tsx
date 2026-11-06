import type { Metadata } from "next";
import Link from "next/link";
import { CategoryForm } from "@/components/admin/category-form";
import { Card, PageHeader } from "@/components/admin/ui";
import { adminCategories } from "@/lib/admin";
import { adminUser } from "@/lib/auth";

export const metadata: Metadata = { title: "المجموعات" };

export default async function AdminCategories() {
  if (!(await adminUser())) return null;
  const categories = await adminCategories();
  return (
    <>
      <PageHeader title="المجموعات" subtitle="المجموعات تظهر كأزرار تصفية في صفحة المتجر، بنفس الترتيب هنا." />
      <div className="space-y-5">
        {categories.map((c) => (
          <Card
            key={c.id}
            title={c.name.ar || c.name.en}
            action={
              <Link href="/admin/products" className="text-sm text-gold-deep hover:underline">
                {c.productCount} منتج
              </Link>
            }
          >
            <CategoryForm value={c} productCount={c.productCount} />
          </Card>
        ))}
        <details className="group rounded-3xl border border-dashed border-cocoa/25 p-5 sm:p-6">
          <summary className="min-h-11 cursor-pointer list-none content-center font-semibold text-cocoa">+ مجموعة جديدة</summary>
          <div className="mt-5">
            <CategoryForm value={{ name: { ar: "", he: "", en: "" }, description: { ar: "", he: "", en: "" }, sort: categories.length + 1, active: true }} />
          </div>
        </details>
      </div>
    </>
  );
}
