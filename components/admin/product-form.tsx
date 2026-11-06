"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { deleteProduct, saveProductFull, uploadImage } from "@/app/actions/admin-catalog";
import type { ProductEdit } from "@/lib/admin-catalog";
import type { BoxTone } from "@/lib/catalog";
import type { LashMap, LashStyle } from "@/lib/lash";
import { optimizable } from "@/lib/media";
import { BoxVisual } from "../lash-box";
import { field, hintClass, labelClass } from "./ui";

const STYLE_LABEL: Record<LashStyle, string> = { natural: "طبيعي", classic: "كلاسيك", hybrid: "هايبرد", volume: "فوليوم", mega: "ميغا فوليوم", wet: "ويت لوك", lift: "رفع" };
const MAP_LABEL: Record<LashMap, string> = { natural: "طبيعي", cat: "عين القطة", doll: "عين الدمية", squirrel: "سنجاب" };
const TONE_LABEL: Record<BoxTone, string> = { petal: "زهري فاتح", rose: "وردي", blush: "نيود", berry: "توتي" };
const LANGS = [
  { key: "ar", title: "العربية", dir: "rtl" },
  { key: "he", title: "עברית", dir: "rtl" },
  { key: "en", title: "English", dir: "ltr" },
] as const;

/** Shrinks big phone photos before upload (max 1800px, WebP) so they upload fast. */
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 900_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
    return blob && blob.size < file.size ? new File([blob], "photo.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-cocoa/10 bg-ivory p-5 sm:p-6">
      <h2 className="text-base font-semibold text-cocoa">{title}</h2>
      {hint ? <p className={hintClass}>{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const num = (v: string): number | "" => (v.trim() === "" ? "" : Number(v));

export function ProductForm({ value, categories, products, uploads }: { value: ProductEdit; categories: { id: string; name: string }[]; products: { id: string; name: string; price: number }[]; uploads: boolean }) {
  const router = useRouter();
  const [p, setP] = useState<ProductEdit>(value);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<ProductEdit>) => setP((x) => ({ ...x, ...patch }));
  const gift = p.kind === "gift_card";

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    startUpload(async () => {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 8)) {
        const d = new FormData();
        d.set("file", await shrink(f));
        const r = await uploadImage(d);
        if (r.ok) urls.push(r.url);
        else setError(r.error);
      }
      setP((x) => ({ ...x, images: [...x.images, ...urls].slice(0, 12) }));
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function save() {
    setError(null);
    startSave(async () => {
      const r = await saveProductFull(p);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/admin/products?saved=1");
      router.refresh();
    });
  }

  const moveImage = (i: number, d: -1 | 1) =>
    setP((x) => {
      const imgs = [...x.images];
      const j = i + d;
      if (j < 0 || j >= imgs.length) return x;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...x, images: imgs };
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <Section title="نوع المنتج">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "standard", label: "منتج عادي", sub: "رموش، أدوات، بوكس هدية…" },
                { id: "gift_card", label: "بطاقة هدية", sub: "كود إلكتروني يصل برسالة" },
              ] as const
            ).map((k) => (
              <label key={k.id} className="flex min-h-14 cursor-pointer flex-col justify-center rounded-2xl border border-cocoa/15 px-4 py-2 has-checked:border-ink has-checked:bg-ink has-checked:text-ivory">
                <input type="radio" name="kind" checked={p.kind === k.id} onChange={() => set({ kind: k.id })} className="sr-only" />
                <span className="text-sm font-semibold">{k.label}</span>
                <span className="text-xs opacity-70">{k.sub}</span>
              </label>
            ))}
          </div>
          {gift ? <p className={`${hintClass} mt-3`}>كل خيار هو قيمة بطاقة (مثلًا 200 ₪). القيمة التي تحصل عليها الزبونة = المبلغ + نسبة الزيادة من الإعدادات.</p> : null}
        </Section>

        <Section title="الاسم والوصف" hint="العربية مطلوبة. إذا تُركت العبرية أو الإنجليزية فارغة يظهر النص العربي.">
          <div className="space-y-6">
            {LANGS.map((l) => (
              <fieldset key={l.key} className="grid gap-3 border-t border-cocoa/10 pt-5 first:border-0 first:pt-0">
                <legend className="mb-2 text-xs font-semibold tracking-wide text-gold-deep">{l.title}</legend>
                <div>
                  <label htmlFor={`name_${l.key}`} className={labelClass}>
                    الاسم {l.key === "ar" ? <span className="text-rosewood">*</span> : null}
                  </label>
                  <input id={`name_${l.key}`} dir={l.dir} maxLength={80} value={p.name[l.key]} onChange={(e) => set({ name: { ...p.name, [l.key]: e.target.value } })} className={field} />
                </div>
                <div>
                  <label htmlFor={`description_${l.key}`} className={labelClass}>
                    الوصف
                  </label>
                  <textarea id={`description_${l.key}`} dir={l.dir} rows={3} maxLength={1500} value={p.description[l.key]} onChange={(e) => set({ description: { ...p.description, [l.key]: e.target.value } })} className={field} />
                </div>
              </fieldset>
            ))}
          </div>
        </Section>

        <Section title="السعر والتخفيض">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="price" className={labelClass}>
                السعر (₪) <span className="text-rosewood">*</span>
              </label>
              <input id="price" type="number" inputMode="decimal" min={0} step="0.01" value={p.price} onChange={(e) => set({ price: num(e.target.value) })} dir="ltr" className={`${field} text-right`} />
              {p.variants.length ? <p className={hintClass}>يُستعمل للخيارات التي لا سعر خاص لها.</p> : null}
            </div>
            {!gift ? (
              <div>
                <label htmlFor="sale" className={labelClass}>
                  السعر بعد التخفيض (₪)
                </label>
                <input id="sale" type="number" inputMode="decimal" min={0} step="0.01" value={p.salePrice} onChange={(e) => set({ salePrice: num(e.target.value) })} placeholder="بدون تخفيض" dir="ltr" className={`${field} text-right`} />
              </div>
            ) : null}
            {!gift && p.salePrice !== "" ? (
              <>
                <div>
                  <label htmlFor="sale-from" className={labelClass}>
                    يبدأ التخفيض
                  </label>
                  <input id="sale-from" type="date" value={p.saleStartsAt?.slice(0, 10) ?? ""} onChange={(e) => set({ saleStartsAt: e.target.value || null })} className={field} />
                </div>
                <div>
                  <label htmlFor="sale-to" className={labelClass}>
                    ينتهي التخفيض
                  </label>
                  <input id="sale-to" type="date" value={p.saleEndsAt?.slice(0, 10) ?? ""} onChange={(e) => set({ saleEndsAt: e.target.value || null })} className={field} />
                  <p className={hintClass}>فارغ = حتى إشعار آخر. الزبونات اللواتي أضفنه للمفضلة يصلهن إشعار.</p>
                </div>
              </>
            ) : null}
          </div>
        </Section>

        <Section title="الصور" hint="الصورة الأولى تظهر في المتجر. يمكن رفع عدة صور معًا من الهاتف.">
          {p.images.length ? (
            <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {p.images.map((src, i) => (
                <li key={src} className="relative">
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
                    <Image src={src} alt="" fill sizes="120px" unoptimized={!optimizable(src)} className="object-cover" />
                  </span>
                  {i === 0 ? <span className="absolute top-2 start-2 rounded-full bg-ink px-2 py-0.5 text-[0.65rem] text-ivory">الرئيسية</span> : null}
                  <span className="mt-1 flex justify-between text-xs">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="min-h-9 px-2 text-cocoa disabled:opacity-30" aria-label="تقديم الصورة">
                      →
                    </button>
                    <button type="button" onClick={() => set({ images: p.images.filter((_, j) => j !== i) })} className="min-h-9 px-2 text-rosewood">
                      حذف
                    </button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === p.images.length - 1} className="min-h-9 px-2 text-cocoa disabled:opacity-30" aria-label="تأخير الصورة">
                      ←
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {uploads ? (
              <>
                <input ref={fileRef} id="photos" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
                <label htmlFor="photos" className={`btn btn-ink min-h-11 cursor-pointer px-5 text-sm ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                  {uploading ? "جارٍ الرفع…" : "+ رفع صور"}
                </label>
              </>
            ) : null}
            <div className="flex min-w-60 flex-1 gap-2">
              <label htmlFor="img-url" className="sr-only">
                رابط صورة
              </label>
              <input id="img-url" type="url" dir="ltr" value={urlDraft} onChange={(e) => setUrlDraft(e.target.value.trim())} placeholder="أو رابط صورة https://" className={`${field} mt-0 text-sm`} />
              <button
                type="button"
                disabled={!/^https?:\/\/\S+$/i.test(urlDraft)}
                onClick={() => {
                  set({ images: [...p.images, urlDraft].slice(0, 12) });
                  setUrlDraft("");
                }}
                className="btn btn-ghost-dark min-h-11 shrink-0 px-4 text-sm disabled:opacity-40"
              >
                إضافة
              </button>
            </div>
          </div>
          {!p.images.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(
                [
                  { key: "style", label: "نوع الرموش", options: STYLE_LABEL },
                  { key: "map", label: "شكل العين", options: MAP_LABEL },
                  { key: "tone", label: "لون العلبة", options: TONE_LABEL },
                ] as const
              ).map((s) => (
                <div key={s.key}>
                  <label htmlFor={`art-${s.key}`} className="text-xs text-taupe">
                    {s.label} (رسم بدل الصورة)
                  </label>
                  <select id={`art-${s.key}`} value={p.art[s.key]} onChange={(e) => set({ art: { ...p.art, [s.key]: e.target.value } })} className={field}>
                    {Object.entries(s.options).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : null}
        </Section>

        <Section title={gift ? "قيم البطاقة" : "الخيارات (اختياري)"} hint={gift ? "مثلًا: 200 ₪، 300 ₪، 400 ₪ — السعر لكل قيمة هو ما تدفعه الزبونة." : "مثل الطول أو الانحناء. لكل خيار سعر (اختياري) وكمية خاصة به. تختار الزبونة الخيار قبل الإضافة للسلة."}>
          {!gift ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {LANGS.map((l) => (
                <div key={l.key}>
                  <label htmlFor={`opt-${l.key}`} className="text-xs text-taupe">
                    اسم الخيار ({l.title})
                  </label>
                  <input id={`opt-${l.key}`} dir={l.dir} value={p.optionsLabel[l.key]} onChange={(e) => set({ optionsLabel: { ...p.optionsLabel, [l.key]: e.target.value } })} placeholder={l.key === "ar" ? "الطول" : l.key === "he" ? "אורך" : "Length"} className={field} />
                </div>
              ))}
            </div>
          ) : null}
          {p.variants.length ? (
            <ul className="space-y-3">
              {p.variants.map((v, i) => {
                const upd = (patch: Partial<ProductEdit["variants"][number]>) => set({ variants: p.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <li key={v.id ?? `new-${i}`} className="grid gap-2 rounded-2xl border border-cocoa/10 bg-white/50 p-3 sm:grid-cols-[1fr_1fr_1fr_6rem_6rem_auto] sm:items-end">
                    {LANGS.map((l) => (
                      <div key={l.key}>
                        <label className="text-[0.7rem] text-taupe">
                          {l.title}
                          <input dir={l.dir} value={v.name[l.key]} onChange={(e) => upd({ name: { ...v.name, [l.key]: e.target.value } })} className={`${field} py-2`} />
                        </label>
                      </div>
                    ))}
                    <label className="text-[0.7rem] text-taupe">
                      السعر
                      <input type="number" inputMode="decimal" min={0} value={v.price} onChange={(e) => upd({ price: num(e.target.value) })} placeholder="—" dir="ltr" className={`${field} py-2 text-right`} />
                    </label>
                    {!gift ? (
                      <label className="text-[0.7rem] text-taupe">
                        الكمية
                        <input type="number" inputMode="numeric" step={1} value={v.stock} onChange={(e) => upd({ stock: num(e.target.value) })} placeholder="∞" dir="ltr" className={`${field} py-2 text-right`} />
                      </label>
                    ) : (
                      <span />
                    )}
                    <span className="flex items-center gap-2">
                      <label className="flex min-h-11 items-center gap-1 text-xs text-taupe">
                        <input type="checkbox" checked={v.active} onChange={(e) => upd({ active: e.target.checked })} className="h-4 w-4 accent-[#7d5e27]" /> ظاهر
                      </label>
                      <button type="button" onClick={() => set({ variants: p.variants.filter((_, j) => j !== i) })} className="min-h-11 px-2 text-sm text-rosewood" aria-label={`حذف الخيار ${v.name.ar}`}>
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <button type="button" onClick={() => set({ variants: [...p.variants, { name: { ar: "", he: "", en: "" }, price: "", stock: "", active: true }] })} className="btn btn-ghost-dark mt-3 min-h-11 px-5 text-sm">
            + {gift ? "قيمة" : "خيار"}
          </button>
        </Section>

        {!gift ? (
          <Section title="المخزون" hint={p.variants.length ? "الكمية تُدار لكل خيار في القائمة أعلاه." : "اتركي الكمية فارغة إذا كنتِ لا تريدين تتبّعها."}>
            <div className="grid gap-4 sm:grid-cols-3">
              {!p.variants.length ? (
                <div>
                  <label htmlFor="stock" className={labelClass}>
                    الكمية الموجودة
                  </label>
                  <input id="stock" type="number" inputMode="numeric" step={1} value={p.stock} onChange={(e) => set({ stock: num(e.target.value) })} placeholder="بدون تتبّع" dir="ltr" className={`${field} text-right`} />
                </div>
              ) : null}
              <div>
                <label htmlFor="low" className={labelClass}>
                  تنبيه «كمية قليلة» عند
                </label>
                <input id="low" type="number" inputMode="numeric" min={0} step={1} value={p.lowStockThreshold} onChange={(e) => set({ lowStockThreshold: Number(e.target.value) || 0 })} dir="ltr" className={`${field} text-right`} />
              </div>
              <label className="flex min-h-11 items-center gap-3 self-end text-sm text-cocoa">
                <input type="checkbox" checked={p.sellWhenOut} onChange={(e) => set({ sellWhenOut: e.target.checked })} className="h-5 w-5 accent-[#7d5e27]" />
                استمرار البيع عند النفاد (طلب مسبق)
              </label>
            </div>
          </Section>
        ) : null}

        {!gift ? (
          <Section title="منتجات مرافقة بسعر خاص" hint="تظهر في صفحة المنتج وفي السلة: «أضيفي معه بسعر خاص». السعر الخاص يُطبَّق فقط مع هذا المنتج.">
            {p.addons.length ? (
              <ul className="space-y-2">
                {p.addons.map((a, i) => (
                  <li key={i} className="flex flex-wrap items-end gap-2">
                    <label className="min-w-48 flex-1 text-xs text-taupe">
                      المنتج
                      <select value={a.addonId} onChange={(e) => set({ addons: p.addons.map((x, j) => (j === i ? { ...x, addonId: e.target.value } : x)) })} className={field}>
                        <option value="">اختيار…</option>
                        {products
                          .filter((x) => x.id !== p.id)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name} ({x.price} ₪)
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="w-32 text-xs text-taupe">
                      السعر الخاص
                      <input type="number" inputMode="decimal" min={0} value={a.specialPrice} onChange={(e) => set({ addons: p.addons.map((x, j) => (j === i ? { ...x, specialPrice: num(e.target.value) } : x)) })} dir="ltr" className={`${field} text-right`} />
                    </label>
                    <button type="button" onClick={() => set({ addons: p.addons.filter((_, j) => j !== i) })} className="min-h-11 px-3 text-rosewood">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" onClick={() => set({ addons: [...p.addons, { addonId: "", specialPrice: "" }] })} className="btn btn-ghost-dark mt-3 min-h-11 px-5 text-sm">
              + منتج مرافق
            </button>
          </Section>
        ) : null}
      </div>

      <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
        <section className="rounded-3xl border border-cocoa/10 bg-ivory p-5">
          <div className="mx-auto max-w-[14rem]">
            {p.images[0] ? (
              <span className="relative block aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-sand">
                <Image src={p.images[0]} alt="" fill sizes="224px" unoptimized={!optimizable(p.images[0])} className="object-cover" />
              </span>
            ) : (
              <BoxVisual art={{ style: p.art.style as LashStyle, map: p.art.map as LashMap, tone: p.art.tone as BoxTone }} label={p.name.en || "Serag"} />
            )}
          </div>
          <div className="mt-5 space-y-4">
            {!gift ? (
              <div>
                <label htmlFor="cat" className={labelClass}>
                  المجموعة <span className="text-rosewood">*</span>
                </label>
                <select id="cat" value={p.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={field}>
                  <option value="">اختيار…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label htmlFor="sort" className={labelClass}>
                الترتيب
              </label>
              <input id="sort" type="number" step={1} value={p.sort} onChange={(e) => set({ sort: Number(e.target.value) || 0 })} dir="ltr" className={`${field} text-right`} />
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm text-cocoa">
              <input type="checkbox" checked={p.active} onChange={(e) => set({ active: e.target.checked })} className="h-5 w-5 accent-[#7d5e27]" />
              معروض في المتجر
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm text-cocoa">
              <input type="checkbox" checked={p.featured} onChange={(e) => set({ featured: e.target.checked })} className="h-5 w-5 accent-[#7d5e27]" />
              منتج مميّز
            </label>
          </div>
        </section>

        <div className="space-y-3 rounded-3xl bg-ink p-5 text-ivory">
          <button type="button" onClick={save} disabled={saving || uploading} className="btn btn-gold min-h-12 w-full disabled:opacity-60">
            {saving ? "جارٍ الحفظ…" : p.id ? "حفظ التعديلات" : "إضافة المنتج"}
          </button>
          {error ? (
            <p role="alert" className="text-sm text-rose">
              {error}
            </p>
          ) : null}
          {p.id ? (
            confirmDelete ? (
              <div className="rounded-2xl bg-ivory/10 p-3 text-sm" role="alertdialog" aria-label="تأكيد الحذف">
                <p>حذف المنتج نهائيًا؟ الطلبات السابقة تحتفظ باسمه وسعره. يمكن إخفاؤه بدل حذفه.</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      startSave(async () => {
                        await deleteProduct(p.id!);
                        router.push("/admin/products?deleted=1");
                        router.refresh();
                      })
                    }
                    className="min-h-11 rounded-full bg-rose px-4 text-ink"
                  >
                    نعم، حذف
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 rounded-full px-4 text-ivory/80">
                    تراجع
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 w-full text-sm text-rose hover:underline">
                حذف المنتج
              </button>
            )
          ) : null}
        </div>
      </aside>
    </div>
  );
}
