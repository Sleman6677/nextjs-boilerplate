"use client";

import { useState, type FormEvent } from "react";
import { services, site, whatsappLink } from "@/lib/site";
import { Check, WhatsApp } from "./icons";

type Errors = Partial<Record<"name" | "phone" | "service" | "date", string>>;

const times = ["صباحًا", "ظهرًا", "مساءً"] as const;

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function BookingForm({ defaultService }: { defaultService?: string }) {
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const service = String(data.get("service") ?? "");
    const date = String(data.get("date") ?? "");
    const time = String(data.get("time") ?? "");
    const first = data.get("first") === "on";
    const notes = String(data.get("notes") ?? "").trim();

    const next: Errors = {};
    if (name.length < 2) next.name = "اكتبي اسمكِ من فضلك";
    if (phone.replace(/\D/g, "").length < 7) next.phone = "أدخلي رقم هاتف صحيحًا لنتواصل معكِ";
    if (!service) next.service = "اختاري الخدمة التي تودّينها";
    if (!date) next.date = "اختاري اليوم المناسب";
    else if (date < todayISO()) next.date = "اختاري تاريخًا من اليوم فصاعدًا";

    setErrors(next);
    if (Object.keys(next).length) {
      const firstField = Object.keys(next)[0];
      e.currentTarget.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      return;
    }

    const serviceName = services.find((s) => s.id === service)?.name ?? service;
    const lines = [
      `مرحبًا ${site.nameAr}، أودّ حجز موعد:`,
      `الاسم: ${name}`,
      `الهاتف: ${phone}`,
      `الخدمة: ${serviceName}`,
      `التاريخ: ${date}`,
      time ? `الوقت المفضل: ${time}` : null,
      first ? `زيارتي الأولى (رمز العرض: ${site.offer.code})` : null,
      notes ? `ملاحظات: ${notes}` : null,
    ].filter(Boolean);

    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
    setSent(true);
  }

  const field =
    "mt-2 block w-full rounded-2xl border bg-ivory px-4 py-3.5 text-base text-cocoa placeholder:text-taupe/70 transition-colors duration-200 focus:border-gold-deep focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";
  const border = (k: keyof Errors) => (errors[k] ? "border-rosewood" : "border-cocoa/15");

  if (sent) {
    return (
      <div className="rounded-[2rem] border border-gold/30 bg-ivory p-10 text-center" role="status">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold text-ink">
          <Check className="h-7 w-7" />
        </span>
        <h2 className="font-display mt-6 text-3xl text-cocoa">رسالتكِ جاهزة في واتساب</h2>
        <p className="mx-auto mt-3 max-w-sm text-taupe">
          أرسليها من نافذة واتساب التي فُتحت، وسنؤكد موعدكِ في أقرب وقت. إن لم تُفتح النافذة، تواصلي معنا مباشرة.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-ink">
            <WhatsApp className="h-5 w-5" /> فتح واتساب
          </a>
          <button type="button" onClick={() => setSent(false)} className="btn btn-ghost-dark">
            تعديل الطلب
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[2rem] border border-cocoa/10 bg-ivory/70 p-6 shadow-[0_30px_80px_-50px_rgba(43,33,28,0.5)] backdrop-blur sm:p-10">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-semibold text-cocoa">
            الاسم
          </label>
          <input id="name" name="name" autoComplete="name" className={`${field} ${border("name")}`} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
          {errors.name && <p id="name-err" className="mt-2 text-sm text-rosewood">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="text-sm font-semibold text-cocoa">
            رقم الهاتف
          </label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={`${field} ${border("phone")} text-right`} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-err" : undefined} />
          {errors.phone && <p id="phone-err" className="mt-2 text-sm text-rosewood">{errors.phone}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="service" className="text-sm font-semibold text-cocoa">
            الخدمة
          </label>
          <select id="service" name="service" defaultValue={defaultService ?? ""} className={`${field} ${border("service")} appearance-none`} aria-invalid={!!errors.service} aria-describedby={errors.service ? "service-err" : undefined}>
            <option value="" disabled>
              اختاري الخدمة
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.latin}
              </option>
            ))}
            <option value="refill">تعبئة</option>
            <option value="consult">استشارة فقط</option>
          </select>
          {errors.service && <p id="service-err" className="mt-2 text-sm text-rosewood">{errors.service}</p>}
        </div>

        <div>
          <label htmlFor="date" className="text-sm font-semibold text-cocoa">
            اليوم المفضل
          </label>
          <input id="date" name="date" type="date" min={todayISO()} suppressHydrationWarning className={`${field} ${border("date")}`} aria-invalid={!!errors.date} aria-describedby={errors.date ? "date-err" : undefined} />
          {errors.date && <p id="date-err" className="mt-2 text-sm text-rosewood">{errors.date}</p>}
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-cocoa">الوقت المفضل</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {times.map((t, i) => (
              <label key={t}>
                <input type="radio" name="time" value={t} defaultChecked={i === 1} className="peer sr-only" />
                <span className="flex min-h-[3.2rem] items-center justify-center rounded-2xl border border-cocoa/15 bg-ivory text-sm text-cocoa transition-colors duration-200 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ivory peer-focus-visible:ring-2 peer-focus-visible:ring-gold">
                  {t}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className="text-sm font-semibold text-cocoa">
            ملاحظات <span className="font-normal text-taupe">(اختياري)</span>
          </label>
          <textarea id="notes" name="notes" rows={3} className={`${field} border-cocoa/15 resize-none`} placeholder="حساسية، إطلالة تحبينها، مناسبة قادمة…" />
        </div>

        <label className="flex items-start gap-3 sm:col-span-2">
          <input type="checkbox" name="first" className="mt-1.5 h-5 w-5 shrink-0 accent-[#7d5e27]" />
          <span className="text-cocoa">
            هذه زيارتي الأولى <span className="text-taupe">— أريد الاستفادة من {site.offer.headline}</span>
          </span>
        </label>
      </div>

      <button type="submit" className="btn btn-gold mt-8 w-full text-base">
        <WhatsApp className="h-5 w-5" />
        إرسال الطلب عبر واتساب
      </button>
      <p className="mt-4 text-center text-sm text-taupe">لا يُرسل أي شيء قبل أن تضغطي «إرسال» داخل واتساب.</p>
    </form>
  );
}
