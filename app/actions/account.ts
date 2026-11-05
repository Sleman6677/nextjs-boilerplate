"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function saveProfile(input: { fullName: string; phone: string; lang: string }): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  const lang = isLocale(input.lang) ? input.lang : "ar";
  await sql()`update profiles set full_name = ${clean(input.fullName, 80) || null}, phone = ${clean(input.phone, 30) || null}, preferred_lang = ${lang} where id = ${user.id}`;
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

export type AddressInput = { id?: string; label: string; recipient: string; phone: string; city: string; street: string; notes: string; isDefault: boolean };

export async function saveAddress(input: AddressInput): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "auth" };
  const a = {
    label: clean(input.label, 40) || null,
    recipient: clean(input.recipient, 80),
    phone: clean(input.phone, 30),
    city: clean(input.city, 80),
    street: clean(input.street, 160),
    notes: clean(input.notes, 300) || null,
  };
  if (a.recipient.length < 2 || a.phone.replace(/\D/g, "").length < 7 || a.city.length < 2 || a.street.length < 2) return { ok: false, error: "required" };

  await sql().begin(async (tx) => {
    const [{ c }] = await tx`select count(*)::int as c from addresses where user_id = ${user.id}`;
    const makeDefault = Boolean(input.isDefault) || Number(c) === 0;
    if (makeDefault) await tx`update addresses set is_default = false where user_id = ${user.id}`;
    if (input.id) {
      await tx`update addresses set label = ${a.label}, recipient = ${a.recipient}, phone = ${a.phone}, city = ${a.city}, street = ${a.street}, notes = ${a.notes},
        is_default = case when ${makeDefault} then true else is_default end where id = ${input.id} and user_id = ${user.id}`;
    } else {
      await tx`insert into addresses (user_id, label, recipient, phone, city, street, notes, is_default)
        values (${user.id}, ${a.label}, ${a.recipient}, ${a.phone}, ${a.city}, ${a.street}, ${a.notes}, ${makeDefault})`;
    }
  });
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  await sql().begin(async (tx) => {
    const [deleted] = await tx`delete from addresses where id = ${id} and user_id = ${user.id} returning is_default`;
    if (deleted?.is_default) {
      await tx`update addresses set is_default = true where id = (select id from addresses where user_id = ${user.id} order by created_at desc limit 1)`;
    }
  });
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  await sql().begin(async (tx) => {
    const [own] = await tx`select 1 from addresses where id = ${id} and user_id = ${user.id}`;
    if (!own) return;
    await tx`update addresses set is_default = (id = ${id}) where user_id = ${user.id}`;
  });
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}
