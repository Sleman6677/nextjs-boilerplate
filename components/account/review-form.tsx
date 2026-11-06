"use client";

import { useState, type FormEvent } from "react";
import { submitReview } from "@/app/actions/account";
import { t } from "@/lib/i18n/format";
import { useI18n } from "../i18n-provider";
import { Star } from "../icons";

/** 1–5 stars, a few words and an optional photo for a delivered product. */
export function ReviewForm({ productId, name }: { productId: string; name: string }) {
  const { dict } = useI18n();
  const r = dict.store.account;
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) return;
    setState("busy");
    const d = new FormData(e.currentTarget);
    d.set("productId", productId);
    d.set("rating", String(rating));
    const res = await submitReview(d);
    setState(res.ok ? "done" : "error");
  }

  if (state === "done") return <p role="status" className="text-sm text-gold-deep">{r.reviewThanks}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <fieldset>
        <legend className="text-sm font-semibold text-cocoa">
          {r.rating}: {name}
        </legend>
        <div className="mt-2 flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="stars" value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" aria-label={t(r.stars, { n })} />
              <span className="grid h-11 w-11 place-items-center rounded-full text-gold-deep peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
                <Star filled={n <= rating} className="h-7 w-7" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="sr-only">{r.reviewPh}</span>
        <textarea name="body" rows={2} maxLength={1000} placeholder={r.reviewPh} className="w-full rounded-2xl border border-cocoa/15 bg-ivory px-4 py-3 text-base text-cocoa focus:border-gold-deep focus:outline-none" />
      </label>
      <label className="block text-sm text-taupe">
        {r.reviewPhoto}
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-sand file:px-4 file:py-2 file:text-cocoa" />
      </label>
      <button type="submit" disabled={!rating || state === "busy"} className="btn btn-ink min-h-11 px-6 text-sm disabled:opacity-50">
        {r.reviewSend}
      </button>
      {state === "error" ? <p role="alert" className="text-sm text-rosewood">{r.reviewError}</p> : null}
    </form>
  );
}
