import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CouponForm } from "@/components/admin/coupon-form";
import { PageHeader } from "@/components/admin/ui";
import { adminCoupon } from "@/lib/admin";
import { dateInput } from "@/lib/admin-format";
import { adminUser } from "@/lib/auth";

export const metadata: Metadata = { title: "تعديل كوبون" };

export default async function EditCoupon({ params }: PageProps<"/admin/coupons/[id]">) {
  if (!(await adminUser())) return null;
  const { id } = await params;
  const c = await adminCoupon(id);
  if (!c) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/coupons", label: "الكوبونات" }} title={c.code} subtitle={`استُعمل ${c.usedCount} مرة`} />
      <CouponForm
        value={{
          id: c.id,
          code: c.code,
          kind: c.kind,
          value: c.value,
          minSubtotal: c.minSubtotal,
          maxUses: c.maxUses ?? "",
          startsAt: dateInput(c.startsAt),
          endsAt: dateInput(c.endsAt),
          oncePerCustomer: c.oncePerCustomer,
          active: c.active,
        }}
      />
    </>
  );
}
