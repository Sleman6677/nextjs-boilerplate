import type { Metadata } from "next";
import Link from "next/link";
import { deleteOffer, setOfferActive } from "@/app/actions/admin-marketing";
import { ActionButton } from "@/components/admin/action-button";
import { Empty, NoAccess, Notice, PageHeader } from "@/components/admin/ui";
import { day, shekel } from "@/lib/admin-format";
import { adminOffers } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";

export const metadata: Metadata = { title: "العروض والتخفيضات" };

export default async function Offers({ searchParams }: PageProps<"/admin/offers">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("marketing")) return <NoAccess />;
  const sp = await searchParams;
  const offers = await adminOffers();
  return (
    <>
      <PageHeader
        title="العروض والتخفيضات"
        subtitle="خصومات تلقائية بدون كود: على منتج أو مجموعة، لفترة محددة أو عند شراء كمية. لتخفيض منتج واحد يمكن أيضًا كتابة «السعر بعد التخفيض» في صفحة المنتج."
        action={
          <Link href="/admin/offers/new" className="btn btn-ink min-h-11 px-5 text-sm">
            + عرض جديد
          </Link>
        }
      />
      {sp.saved ? <Notice>تم حفظ العرض.</Notice> : null}
      {offers.length === 0 ? (
        <Empty>لا توجد عروض بعد.</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {offers.map((o) => {
            const running = o.running;
            return (
              <li key={o.id} className={`rounded-3xl border border-cocoa/10 bg-surface p-5 ${o.active ? "" : "opacity-70"}`}>
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/admin/offers/${o.id}`} className="font-semibold text-cocoa hover:text-gold-deep">
                    {o.name.ar}
                  </Link>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${running ? "bg-emerald-700/10 text-emerald-800" : "bg-ivory/10 text-taupe"}`}>{running ? "يعمل الآن" : o.active ? "مجدول/منتهٍ" : "موقوف"}</span>
                </div>
                <p className="mt-2 text-sm text-taupe">
                  {o.kind === "percent" ? `${o.value}٪` : `${shekel(o.value)} لكل قطعة`} · {o.scope === "all" ? "كل المنتجات" : o.scope === "products" ? `${o.productIds.length} منتج` : `${o.categoryIds.length} مجموعة`}
                  {o.minQty > 1 ? ` · من ${o.minQty} قطع` : ""}
                  {o.startsAt ? ` · من ${day(o.startsAt)}` : ""}
                  {o.endsAt ? ` · حتى ${day(o.endsAt)}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 border-t border-cocoa/10 pt-2">
                  <ActionButton action={setOfferActive.bind(null, o.id, !o.active)}>{o.active ? "إيقاف" : "تفعيل"}</ActionButton>
                  <Link href={`/admin/offers/${o.id}`} className="min-h-11 content-center text-sm text-gold-deep hover:underline">
                    تعديل
                  </Link>
                  <ActionButton action={deleteOffer.bind(null, o.id)} confirm="حذف العرض؟" className="min-h-11 text-sm text-rosewood">
                    حذف
                  </ActionButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
