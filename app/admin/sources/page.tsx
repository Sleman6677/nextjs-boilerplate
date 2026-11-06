import type { Metadata } from "next";
import Link from "next/link";
import { Empty, NoAccess, PageHeader } from "@/components/admin/ui";
import { shekel } from "@/lib/admin-format";
import { sources } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "مصادر الطلبات" };

const LABEL: Record<string, string> = { direct: "الموقع مباشرة", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", whatsapp: "WhatsApp", google: "Google" };

export default async function Sources({ searchParams }: PageProps<"/admin/sources">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("reports")) return <NoAccess />;
  const sp = await searchParams;
  const days = [30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 90;
  const rows = await sources(days);
  const site = siteUrl();
  return (
    <>
      <PageHeader title="مصادر الطلبات" subtitle="من أين جاءت الطلبات: كود مؤثرة أو حملة أو كوبون مرتبط بمصدر، أو الموقع مباشرة." />
      <div className="mb-4 flex gap-2" role="group" aria-label="الفترة">
        {[30, 90, 365].map((d) => (
          <Link key={d} href={`/admin/sources?days=${d}`} aria-current={d === days ? "page" : undefined} className="flex min-h-11 items-center rounded-full border border-cocoa/15 px-4 text-sm text-cocoa aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-ivory">
            {d === 365 ? "سنة" : `${d} يومًا`}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty>لا طلبات في هذه الفترة.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-cocoa/10 bg-ivory">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="text-xs text-taupe">
              <tr className="border-b border-cocoa/10">
                <th className="p-4 text-start font-medium">المصدر</th>
                <th className="p-4 text-start font-medium">الزبائن</th>
                <th className="p-4 text-start font-medium">الطلبات</th>
                <th className="p-4 text-start font-medium">المبيعات</th>
                <th className="p-4 text-start font-medium">الخصومات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.source} className="border-b border-cocoa/5 last:border-0">
                  <td className="p-4 font-medium text-cocoa" dir={r.source.startsWith("ref:") ? "ltr" : undefined}>
                    {r.source.startsWith("ref:") ? `كود ${r.source.slice(4)}` : (LABEL[r.source] ?? r.source)}
                  </td>
                  <td className="p-4">{r.customers}</td>
                  <td className="p-4">{r.orders}</td>
                  <td className="p-4">{shekel(r.sales)}</td>
                  <td className="p-4">{shekel(r.discounts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <section className="mt-8 rounded-3xl border border-dashed border-cocoa/25 p-5 text-sm leading-7 text-taupe">
        <h2 className="font-semibold text-cocoa">كيف أعرف مصدر الطلب؟</h2>
        <ul className="mt-2 list-disc space-y-1 ps-5">
          <li>
            رابط لمؤثرة/مسوقة: <span dir="ltr" className="rounded bg-sand px-1.5 text-cocoa">{site}/ar?ref=noor</span> — كل طلب بعده يُحسب لـ «noor».
          </li>
          <li>
            حملة إعلانية: <span dir="ltr" className="rounded bg-sand px-1.5 text-cocoa">{site}/ar?utm_source=instagram&utm_campaign=eid</span>
          </li>
          <li>كوبون مرتبط بمصدر: عند إنشاء الكوبون يُكتب المصدر (مثلًا اسم المؤثرة)، فيُحسب كل طلب استعمله لهذا المصدر.</li>
        </ul>
      </section>
    </>
  );
}
