"use client";

import { useState } from "react";
import { labelClass } from "./ui";

/** "Applies to": everything, chosen products, or chosen groups (checkbox lists posted as product_ids / category_ids). */
export function ScopePicker({ scope, productIds, categoryIds, products, categories }: { scope: string; productIds: string[]; categoryIds: string[]; products: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const [s, setS] = useState(scope || "all");
  const opts = [
    { id: "all", label: "كل المنتجات" },
    { id: "categories", label: "مجموعات محددة" },
    { id: "products", label: "منتجات محددة" },
  ];
  const list = s === "products" ? products : s === "categories" ? categories : [];
  const chosen = s === "products" ? productIds : categoryIds;
  return (
    <fieldset>
      <legend className={labelClass}>ينطبق على</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {opts.map((o) => (
          <label key={o.id} className="flex min-h-11 cursor-pointer items-center rounded-full border border-cocoa/15 px-4 text-sm has-checked:border-ink has-checked:bg-ink has-checked:text-ivory">
            <input type="radio" name="scope" value={o.id} checked={s === o.id} onChange={() => setS(o.id)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {list.length ? (
        <div className="mt-3 grid max-h-56 gap-1 overflow-y-auto rounded-2xl border border-cocoa/10 bg-white/50 p-3 sm:grid-cols-2">
          {list.map((x) => (
            <label key={x.id} className="flex min-h-10 items-center gap-2 text-sm text-cocoa">
              <input type="checkbox" name={s === "products" ? "product_ids" : "category_ids"} value={x.id} defaultChecked={chosen.includes(x.id)} className="h-4 w-4 accent-[#7d5e27]" />
              {x.name}
            </label>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
