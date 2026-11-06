import type { Metadata } from "next";
import Link from "next/link";
import { markMessageSent, retryMessage } from "@/app/actions/admin-marketing";
import { ActionButton } from "@/components/admin/action-button";
import { BroadcastForm, TemplateForm } from "@/components/admin/marketing-forms";
import { Card, Empty, NoAccess, Notice, PageHeader } from "@/components/admin/ui";
import { when, whatsappTo } from "@/lib/admin-format";
import { adminProducts } from "@/lib/admin";
import { messagesLog, templates } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { TEMPLATES } from "@/lib/messages";
import { smsConfigured } from "@/lib/sms";

export const metadata: Metadata = { title: "الرسائل" };
const STATUS: Record<string, [string, string]> = { sent: ["أُرسلت", "text-emerald-800"], queued: ["بانتظار الإرسال", "text-gold-deep"], failed: ["فشلت", "text-rosewood"], skipped: ["تخطّي", "text-taupe"] };

export default async function Messages({ searchParams }: PageProps<"/admin/messages">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("marketing")) return <NoAccess />;
  const sp = await searchParams;
  const tab = sp.tab === "templates" || sp.tab === "send" ? sp.tab : "log";
  const status = typeof sp.s === "string" ? sp.s : "all";
  const configured = smsConfigured();
  return (
    <>
      <PageHeader title="الرسائل" subtitle="رسائل SMS للزبونات: رسائل الطلبات تصل للجميع، ورسائل العروض فقط لمن وافقت." />
      {!configured ? (
        <Notice tone="warn">
          حساب 019 SMS غير مربوط بعد: الرسائل تُحفظ «بانتظار الإرسال»، ويمكن إرسالها يدويًا بالواتساب ثم الضغط على «أُرسلت». تسجيل الدخول برقم الهاتف لا يعمل بدون الحساب.
        </Notice>
      ) : null}
      <div className="mb-6 flex gap-2" role="tablist">
        {[
          { id: "log", label: "السجل" },
          { id: "send", label: "رسالة تسويقية" },
          { id: "templates", label: "نصوص الرسائل" },
        ].map((t) => (
          <Link key={t.id} href={`/admin/messages?tab=${t.id}`} role="tab" aria-selected={tab === t.id} className="flex min-h-11 items-center rounded-full border border-cocoa/15 px-4 text-sm text-cocoa aria-selected:border-ink aria-selected:bg-ink aria-selected:text-ivory">
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "templates" ? (
        <TemplatesTab />
      ) : tab === "send" ? (
        <SendTab />
      ) : (
        <LogTab status={status} configured={configured} />
      )}
    </>
  );
}

async function TemplatesTab() {
  const t = await templates();
  return (
    <div className="space-y-3">
      {(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map((k) => (
        <TemplateForm key={k} id={k} label={TEMPLATES[k].label} kind={TEMPLATES[k].kind} vars={TEMPLATES[k].vars} value={t[k] ?? { ar: "", he: "", en: "", enabled: true }} />
      ))}
    </div>
  );
}

async function SendTab() {
  const [products, [c]] = await Promise.all([adminProducts(), sql()`select count(*)::int as c from profiles where marketing_consent and phone_norm like '+9725%'`]);
  return (
    <Card title="رسالة عروض أو كوبونات">
      <BroadcastForm products={products.filter((p) => p.kind === "standard").map((p) => ({ id: p.id, name: p.name.ar || p.name.en }))} consenting={Number(c.c)} />
    </Card>
  );
}

async function LogTab({ status, configured }: { status: string; configured: boolean }) {
  const rows = await messagesLog(status);
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="الحالة">
        {["all", "queued", "sent", "failed", "skipped"].map((s) => (
          <Link key={s} href={`/admin/messages?s=${s}`} aria-current={status === s ? "page" : undefined} className="flex min-h-11 items-center rounded-full border border-cocoa/15 px-4 text-sm text-cocoa aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-ivory">
            {s === "all" ? "الكل" : STATUS[s][0]}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty>لا توجد رسائل.</Empty>
      ) : (
        <ul className="divide-y divide-cocoa/10 rounded-3xl border border-cocoa/10 bg-ivory">
          {rows.map((m) => {
            const wa = whatsappTo(m.phone, m.body);
            return (
              <li key={m.id} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  <span className="text-cocoa">
                    {m.name || "—"} · <span dir="ltr">{m.phone}</span> · {TEMPLATES[m.template as keyof typeof TEMPLATES]?.label ?? m.template}
                    {m.orderNumber ? ` · طلب #${m.orderNumber}` : ""}
                  </span>
                  <span className={STATUS[m.status]?.[1]}>
                    {STATUS[m.status]?.[0] ?? m.status} · {when(m.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-taupe">{m.body}</p>
                {m.error && m.status !== "sent" ? <p className="mt-1 text-xs text-rosewood">{m.error}</p> : null}
                {m.status === "queued" || m.status === "failed" ? (
                  <div className="mt-2 flex flex-wrap gap-4">
                    {wa ? (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="min-h-11 content-center text-sm font-semibold text-emerald-800">
                        إرسال بالواتساب
                      </a>
                    ) : null}
                    <ActionButton action={markMessageSent.bind(null, m.id)}>أُرسلت</ActionButton>
                    {configured ? <ActionButton action={retryMessage.bind(null, m.id)}>إعادة المحاولة</ActionButton> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
