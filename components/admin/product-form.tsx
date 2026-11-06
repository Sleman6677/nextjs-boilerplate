"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { deleteProduct, saveProduct, uploadProductImage, type FormState } from "@/app/actions/admin";
import type { BoxTone } from "@/lib/catalog";
import type { LashMap, LashStyle } from "@/lib/lash";
import { BoxVisual } from "../lash-box";
import { FormResult, SubmitButton, Toggle } from "./form-bits";
import { field, hintClass, labelClass } from "./ui";

export type ProductFormValue = {
  id?: string;
  name: { ar: string; he: string; en: string };
  description: { ar: string; he: string; en: string };
  price: number | "";
  categoryId: string;
  imageUrl: string;
  art: { style: LashStyle; map: LashMap; tone: BoxTone };
  sort: number;
  active: boolean;
};

const STYLE_LABEL: Record<LashStyle, string> = { natural: "طبيعي", classic: "كلاسيك", hybrid: "هايبرد", volume: "فوليوم", mega: "ميغا فوليوم", wet: "ويت لوك", lift: "رفع" };
const MAP_LABEL: Record<LashMap, string> = { natural: "طبيعي", cat: "عين القطة", doll: "عين الدمية", squirrel: "سنجاب" };
const TONE_LABEL: Record<BoxTone, string> = { petal: "زهري فاتح", rose: "وردي", blush: "نيود", berry: "توتي" };

const LANGS = [
  { key: "ar", title: "العربية", dir: "rtl", required: true },
  { key: "he", title: "עברית", dir: "rtl", required: false },
  { key: "en", title: "English", dir: "ltr", required: false },
] as const;

/** Shrinks big phone photos before upload (max 1600px, WebP) so they upload fast. */
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 900_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    return blob && blob.size < file.size ? new File([blob], "photo.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

export function ProductForm({ value, categories, uploads }: { value: ProductFormValue; categories: { id: string; name: string }[]; uploads: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(saveProduct, { ok: false, error: null });
  const [art, setArt] = useState(value.art);
  const [imageUrl, setImageUrl] = useState(value.imageUrl);
  const [nameEn, setNameEn] = useState(value.name.en);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    startUpload(async () => {
      const d = new FormData();
      d.set("file", await shrink(file));
      const r = await uploadProductImage(d);
      if (r.ok) setImageUrl(r.url);
      else setUploadError(r.error);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      {value.id ? <input type="hidden" name="id" value={value.id} /> : null}

      <div className="space-y-6">
        <section className="rounded-3xl border border-cocoa/10 bg-ivory p-5 sm:p-6">
          <h2 className="mb-1 text-base font-semibold text-cocoa">الاسم والوصف</h2>
          <p className={hintClass}>العربية مطلوبة. إذا تُركت العبرية أو الإنجليزية فارغة يظهر النص العربي لزوار تلك اللغة.</p>
          <div className="mt-5 space-y-6">
            {LANGS.map((l) => (
              <fieldset key={l.key} className="grid gap-3 border-t border-cocoa/10 pt-5 first:border-0 first:pt-0">
                <legend className="mb-2 text-xs font-semibold tracking-wide text-gold-deep">{l.title}</legend>
                <div>
                  <label htmlFor={`name_${l.key}`} className={labelClass}>
                    الاسم {l.required ? <span className="text-rosewood">*</span> : <span className="font-normal text-taupe">(اختياري)</span>}
                  </label>
                  <input
                    id={`name_${l.key}`}
                    name={`name_${l.key}`}
                    dir={l.dir}
                    required={l.required}
                    maxLength={80}
                    defaultValue={value.name[l.key]}
                    onChange={l.key === "en" ? (e) => setNameEn(e.target.value) : undefined}
                    className={field}
                  />
                </div>
                <div>
                  <label htmlFor={`description_${l.key}`} className={labelClass}>
                    وصف قصير
                  </label>
                  <textarea id={`description_${l.key}`} name={`description_${l.key}`} dir={l.dir} rows={2} maxLength={400} defaultValue={value.description[l.key]} className={field} />
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <section className="grid gap-5 rounded-3xl border border-cocoa/10 bg-ivory p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <label htmlFor="price" className={labelClass}>
              السعر (₪) <span className="text-rosewood">*</span>
            </label>
            <input id="price" name="price" type="number" inputMode="decimal" min={0} step="0.01" required defaultValue={value.price} dir="ltr" className={`${field} text-right`} />
          </div>
          <div>
            <label htmlFor="category_id" className={labelClass}>
              المجموعة <span className="text-rosewood">*</span>
            </label>
            <select id="category_id" name="category_id" required defaultValue={value.categoryId} className={field}>
              <option value="" disabled>
                اختيار…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sort" className={labelClass}>
              الترتيب
            </label>
            <input id="sort" name="sort" type="number" inputMode="numeric" step={1} defaultValue={value.sort} dir="ltr" className={`${field} text-right`} />
            <p className={hintClass}>الرقم الأصغر يظهر أولًا داخل المجموعة.</p>
          </div>
          <div className="self-center">
            <Toggle name="active" defaultChecked={value.active} label="معروض في المتجر" hint="إيقافه يخفي المنتج دون حذفه." />
          </div>
        </section>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
        <section className="rounded-3xl border border-cocoa/10 bg-ivory p-5">
          <h2 className="mb-3 text-base font-semibold text-cocoa">الصورة</h2>
          <div className="mx-auto max-w-[15rem]">
            <BoxVisual art={art} label={nameEn || "Serag"} imageUrl={imageUrl || null} />
          </div>
          <p className={`${hintClass} mt-3 text-center`}>هكذا تظهر البطاقة في المتجر.</p>

          <div className="mt-4 space-y-3">
            {uploads ? (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="sr-only" id="photo" onChange={(e) => onFile(e.target.files?.[0])} />
                <label htmlFor="photo" className={`btn btn-ghost-dark min-h-11 w-full cursor-pointer text-sm ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                  {uploading ? "جارٍ رفع الصورة…" : imageUrl ? "تغيير الصورة" : "رفع صورة"}
                </label>
              </>
            ) : null}
            <div>
              <label htmlFor="image_url" className="text-xs text-taupe">
                {uploads ? "أو رابط صورة" : "رابط صورة (اختياري)"}
              </label>
              <input id="image_url" name="image_url" type="url" dir="ltr" value={imageUrl} onChange={(e) => setImageUrl(e.target.value.trim())} placeholder="https://" className={`${field} text-sm`} />
            </div>
            {imageUrl ? (
              <button type="button" onClick={() => setImageUrl("")} className="min-h-11 text-sm text-rosewood hover:underline">
                إزالة الصورة واستعمال رسم العلبة
              </button>
            ) : null}
            {uploadError ? (
              <p role="alert" className="text-sm text-rosewood">
                {uploadError}
              </p>
            ) : null}
          </div>
        </section>

        <fieldset className={`space-y-3 rounded-3xl border border-cocoa/10 bg-ivory p-5 ${imageUrl ? "opacity-50" : ""}`}>
          <legend className="sr-only">رسم العلبة</legend>
          <p className="text-base font-semibold text-cocoa">رسم العلبة</p>
          <p className={hintClass}>{imageUrl ? "يُستعمل عند عدم وجود صورة." : "يظهر بدل الصورة: اختيار شكل الرموش ولون العلبة."}</p>
          {(
            [
              { name: "art_style", label: "نوع الرموش", options: STYLE_LABEL, key: "style" },
              { name: "art_map", label: "شكل العين", options: MAP_LABEL, key: "map" },
              { name: "art_tone", label: "لون العلبة", options: TONE_LABEL, key: "tone" },
            ] as const
          ).map((s) => (
            <div key={s.name}>
              <label htmlFor={s.name} className="text-xs text-taupe">
                {s.label}
              </label>
              <select id={s.name} name={s.name} value={art[s.key]} onChange={(e) => setArt((a) => ({ ...a, [s.key]: e.target.value }))} className={field}>
                {Object.entries(s.options).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </fieldset>

        <div className="space-y-3 rounded-3xl bg-ink p-5 text-ivory">
          <SubmitButton className="btn-gold w-full">{value.id ? "حفظ التعديلات" : "إضافة المنتج"}</SubmitButton>
          <FormResult state={state} />
          {value.id ? (
            confirmDelete ? (
              <div className="rounded-2xl bg-ivory/10 p-3 text-sm" role="alertdialog" aria-label="تأكيد الحذف">
                <p>حذف المنتج نهائيًا؟ الطلبات السابقة تحتفظ باسمه وسعره.</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => startDelete(() => deleteProduct(value.id!))}
                    className="min-h-11 rounded-full bg-rose px-4 text-ink disabled:opacity-60"
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
    </form>
  );
}
