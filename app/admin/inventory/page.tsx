import type { Metadata } from "next";
import Link from "next/link";
import { StockEditor } from "@/components/admin/stock-editor";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { inventory } from "@/lib/admin-catalog";
import { staffUser } from "@/lib/auth";

export const metadata: Metadata = { title: "المخزون" };

export default async function Inventory({ searchParams }: PageProps<"/admin/inventory">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("products")) return <NoAccess />;
  const filter = (await searchParams).f;
  const all = await inventory();
  const rows = all.filter((r) => (filter === "low" ? r.stock !== null && r.stock > 0 && r.stock <= r.threshold : filter === "out" ? r.stock !== null && r.stock <= 0 : true));
  const chips = [
    { id: "", label: "الكل", n: all.length },
    { id: "low", label: "كمية قليلة", n: all.filter((r) => r.stock !== null && r.stock > 0 && r.stock <= r.threshold).length },
    { id: "out", label: "نفد", n: all.filter((r) => r.stock !== null && r.stock <= 0).length },
  ];
  return (
    <>
      <PageHeader title="المخزون" subtitle="تعديل الكمية يُحفظ فورًا. عند رجوع منتج نافد تصل رسالة لمن طلبت إبلاغها." />
      <div className="mb-4 flex gap-2" role="group" aria-label="تصفية">
        {chips.map((c) => (
          <Link key={c.id} href={`/admin/inventory${c.id ? `?f=${c.id}` : ""}`} aria-current={(filter ?? "") === c.id ? "page" : undefined} className="flex min-h-11 items-center gap-2 rounded-full border border-cocoa/15 px-4 text-sm text-cocoa aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-ivory">
            {c.label} <span className="text-xs opacity-60">{c.n}</span>
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-3xl border border-cocoa/10 bg-surface">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="text-xs text-taupe">
            <tr className="border-b border-cocoa/10">
              <th className="p-4 text-start font-medium">المنتج</th>
              <th className="p-4 text-start font-medium">المتبقي</th>
              <th className="p-4 text-start font-medium">المباع</th>
              <th className="p-4 text-start font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const state = r.stock === null ? "غير متتبَّع" : r.stock <= 0 ? (r.sellWhenOut ? "نفد (البيع مستمر)" : "نفد") : r.stock <= r.threshold ? "كمية قليلة" : "متوفر";
              const tone = r.stock !== null && r.stock <= 0 ? "text-rosewood" : r.stock !== null && r.stock <= r.threshold ? "text-gold-deep" : "text-taupe";
              return (
                <tr key={`${r.productId}-${r.variantId ?? ""}`} className={`border-b border-cocoa/5 last:border-0 ${r.active ? "" : "opacity-50"}`}>
                  <td className="p-4">
                    <Link href={`/admin/products/${r.productId}`} className="font-medium text-cocoa hover:underline">
                      {r.name}
                    </Link>
                    {r.variant ? <span className="text-taupe"> · {r.variant}</span> : null}
                  </td>
                  <td className="p-3">
                    <StockEditor productId={r.productId} variantId={r.variantId} stock={r.stock} label={`${r.name}${r.variant ? ` ${r.variant}` : ""}`} />
                  </td>
                  <td className="p-4">{r.sold}</td>
                  <td className={`p-4 ${tone}`}>{state}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
