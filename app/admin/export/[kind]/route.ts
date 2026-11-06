import { staffUser, type Permission } from "@/lib/auth";
import { sql } from "@/lib/db";

const NEED: Record<string, Permission> = { orders: "orders", customers: "customers", products: "products" };

function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

/** CSV download for staff (UTF-8 with BOM so Excel shows Arabic and Hebrew correctly). */
export async function GET(_req: Request, ctx: RouteContext<"/admin/export/[kind]">) {
  const { kind } = await ctx.params;
  const need = NEED[kind];
  const staff = await staffUser();
  if (!need || !staff || !staff.permissions.includes(need)) return new Response("Forbidden", { status: 403 });
  const db = sql();
  const rows =
    kind === "orders"
      ? await db`select o.number, o.created_at, o.status, o.payment_method, o.payment_status, o.ship_name, o.ship_phone, o.zone_name, o.ship_city, o.ship_street,
          o.subtotal, o.discount_code, o.discount_amount, o.points_used, o.gift_card_amount, o.shipping_fee, o.total, o.source, o.customer_note, o.tracking_number, o.invoice_number,
          (select string_agg(i.name || coalesce(' (' || i.variant_name || ')', '') || ' x' || i.quantity, '; ') from order_items i where i.order_id = o.id) as items
        from orders o order by o.number`
      : kind === "customers"
        ? await db`select p.full_name, p.phone_norm, p.email, p.birthday, p.marketing_consent, p.created_at,
            (select count(*) from orders o where o.user_id = p.id and o.status <> 'cancelled') as orders,
            (select coalesce(sum(total), 0) from orders o where o.user_id = p.id and o.status not in ('cancelled', 'awaiting_payment')) as spent
          from profiles p order by p.created_at`
        : await db`select p.slug, p.name_ar, p.name_he, p.name_en, v.name_ar as option, coalesce(v.price, p.price) as price, p.sale_price, coalesce(v.stock, p.stock) as stock, p.active
          from products p left join product_variants v on v.product_id = p.id order by p.sort, p.created_at, v.sort`;
  const body = "﻿" + csv(rows as unknown as Record<string, unknown>[]);
  return new Response(body, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="serag-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" },
  });
}
