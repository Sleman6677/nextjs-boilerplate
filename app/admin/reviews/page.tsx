import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { moderateReview } from "@/app/actions/admin-catalog";
import { ActionButton } from "@/components/admin/action-button";
import { Empty, NoAccess, PageHeader } from "@/components/admin/ui";
import { when } from "@/lib/admin-format";
import { reviewsList } from "@/lib/admin-catalog";
import { staffUser } from "@/lib/auth";
import { optimizable } from "@/lib/media";

export const metadata: Metadata = { title: "التقييمات" };
const STATUS: Record<string, string> = { pending: "بانتظار المراجعة", approved: "منشور", hidden: "مخفي" };

export default async function Reviews({ searchParams }: PageProps<"/admin/reviews">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("products")) return <NoAccess />;
  const s = (await searchParams).s;
  const status = s === "approved" || s === "hidden" || s === "all" ? s : "pending";
  const rows = await reviewsList(status);
  return (
    <>
      <PageHeader title="التقييمات" subtitle="التقييم يظهر في صفحة المنتج بعد نشره." />
      <div className="mb-5 flex gap-2" role="group" aria-label="تصفية">
        {(["pending", "approved", "hidden", "all"] as const).map((k) => (
          <Link key={k} href={`/admin/reviews?s=${k}`} aria-current={status === k ? "page" : undefined} className="flex min-h-11 items-center rounded-full border border-cocoa/15 px-4 text-sm text-cocoa aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-ivory">
            {k === "all" ? "الكل" : STATUS[k]}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty>لا توجد تقييمات هنا.</Empty>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-3xl border border-cocoa/10 bg-ivory p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-cocoa">{r.product}</p>
                  <p className="text-xs text-taupe">
                    {r.customer || "—"} · <span dir="ltr">{r.phone}</span> · طلب #{r.orderNumber} · {when(r.createdAt)}
                  </p>
                </div>
                <span className="text-gold-deep" aria-label={`${r.rating} من 5`}>
                  {"★".repeat(r.rating)}
                  <span className="text-cocoa/20">{"★".repeat(5 - r.rating)}</span>
                </span>
              </div>
              {r.body ? <p className="mt-3 leading-7 text-cocoa">{r.body}</p> : null}
              {r.imageUrl ? (
                <span className="relative mt-3 block h-32 w-24 overflow-hidden rounded-xl">
                  <Image src={r.imageUrl} alt="" fill sizes="96px" unoptimized={!optimizable(r.imageUrl)} className="object-cover" />
                </span>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-cocoa/10 pt-2">
                <span className="text-xs text-taupe">{STATUS[r.status]}</span>
                {r.status !== "approved" ? (
                  <ActionButton action={moderateReview.bind(null, r.id, "approved")} className="min-h-11 text-sm font-semibold text-emerald-800">
                    نشر
                  </ActionButton>
                ) : null}
                {r.status !== "hidden" ? <ActionButton action={moderateReview.bind(null, r.id, "hidden")}>إخفاء</ActionButton> : null}
                <ActionButton action={moderateReview.bind(null, r.id, "delete")} confirm="حذف التقييم؟" className="min-h-11 text-sm text-rosewood">
                  حذف
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
