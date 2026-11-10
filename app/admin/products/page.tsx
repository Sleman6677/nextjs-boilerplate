import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductToggle } from "@/components/admin/product-toggle";
import { Empty, NoAccess, Notice, PageHeader } from "@/components/admin/ui";
import { LashPair } from "@/components/lash-box";
import { adminCategories, adminProducts, type AdminProduct } from "@/lib/admin";
import { shekel } from "@/lib/admin-format";
import { staffUser } from "@/lib/auth";

export const metadata: Metadata = { title: "المنتجات" };

const SWATCH: Record<AdminProduct["art"]["tone"], string> = { petal: "bg-pink-soft text-berry", rose: "bg-pink text-berry-deep", blush: "bg-blush text-cocoa", berry: "bg-ink-3 text-gold-soft" };

function Thumb({ p }: { p: AdminProduct }) {
  return (
    <span className={`relative grid h-16 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl ${SWATCH[p.art.tone]}`}>
      {p.imageUrl ? <Image src={p.imageUrl} alt="" fill unoptimized sizes="56px" className="object-cover" /> : <LashPair style={p.art.style} map={p.art.map} className="w-[86%]" />}
    </span>
  );
}

export default async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("products")) return <NoAccess />;
  const sp = await searchParams;
  const [products, categories] = await Promise.all([adminProducts(), adminCategories()]);
  const groups = [
    ...categories.map((c) => ({ id: c.id, name: c.name.ar || c.name.en, active: c.active, items: products.filter((p) => p.categoryId === c.id) })),
    { id: "gift", name: "بطاقات الهدية", active: true, items: products.filter((p) => p.kind === "gift_card") },
    { id: "none", name: "بدون مجموعة", active: false, items: products.filter((p) => p.kind !== "gift_card" && !categories.some((c) => c.id === p.categoryId)) },
  ].filter((g) => (g.id !== "none" && g.id !== "gift") || g.items.length > 0);

  return (
    <>
      <PageHeader
        title="المنتجات"
        subtitle={`${products.length} منتج في ${categories.length} مجموعات · التغييرات تظهر في المتجر فورًا`}
        action={
          <Link href="/admin/products/new" className="btn btn-ink min-h-11 px-5 text-sm">
            + منتج جديد
          </Link>
        }
      />
      {sp.saved ? <Notice>تم حفظ المنتج.</Notice> : null}
      {sp.deleted ? <Notice>تم حذف المنتج.</Notice> : null}

      {products.length === 0 ? <Empty>لا توجد منتجات بعد.</Empty> : null}

      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`g-${g.id}`}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id={`g-${g.id}`} className="font-naskh text-2xl text-cocoa">
                {g.name} <span className="font-sans text-sm text-taupe">({g.items.length})</span>
              </h2>
              {g.id !== "none" && g.id !== "gift" && !g.active ? <span className="text-xs text-rosewood">المجموعة مخفية من المتجر</span> : null}
            </div>
            {g.items.length === 0 ? (
              <Empty>
                لا توجد منتجات في هذه المجموعة.{" "}
                <Link href={`/admin/products/new?category=${g.id}`} className="text-gold-deep underline">
                  إضافة منتج
                </Link>
              </Empty>
            ) : (
              <ul className="divide-y divide-cocoa/10 overflow-hidden rounded-3xl border border-cocoa/10 bg-surface">
                {g.items.map((p) => (
                  <li key={p.id} className={`flex items-center gap-4 px-4 py-3 sm:px-5 ${p.active ? "" : "bg-sand/30"}`}>
                    <Thumb p={p} />
                    <Link href={`/admin/products/${p.id}`} className="min-w-0 flex-1 py-2">
                      <span className={`block truncate font-medium ${p.active ? "text-cocoa" : "text-taupe"}`}>{p.name.ar || p.name.en}</span>
                      <span className="block truncate text-xs text-taupe">
                        {[p.name.he, p.name.en].filter(Boolean).join(" · ") || "بدون ترجمة"} · بيع {p.sold}
                      </span>
                    </Link>
                    <span className="hidden font-semibold text-cocoa sm:block">{shekel(p.price)}</span>
                    <ProductToggle id={p.id} active={p.active} name={p.name.ar || p.name.en} />
                    <Link href={`/admin/products/${p.id}`} className="hidden min-h-11 content-center text-sm text-gold-deep hover:underline md:block">
                      تعديل
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
