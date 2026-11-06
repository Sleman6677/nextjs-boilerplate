import type { Metadata } from "next";
import { CouponForm } from "@/components/admin/coupon-form";
import { PageHeader } from "@/components/admin/ui";
import { adminUser } from "@/lib/auth";

export const metadata: Metadata = { title: "كوبون جديد" };

export default async function NewCoupon() {
  if (!(await adminUser())) return null;
  return (
    <>
      <PageHeader back={{ href: "/admin/coupons", label: "الكوبونات" }} title="كوبون جديد" />
      <CouponForm value={{ code: "", kind: "percent", value: "", minSubtotal: 0, maxUses: "", startsAt: "", endsAt: "", oncePerCustomer: true, active: true }} />
    </>
  );
}
