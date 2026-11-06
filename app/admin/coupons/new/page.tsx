import type { Metadata } from "next";
import { CouponForm } from "@/components/admin/coupon-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { adminCategories, adminProducts } from "@/lib/admin";
import { staffUser } from "@/lib/auth";

export const metadata: Metadata = { title: "كوبون جديد" };

export default async function NewCoupon() {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("marketing")) return <NoAccess />;
  const [products, categories] = await Promise.all([adminProducts(), adminCategories()]);
  return (
    <>
      <PageHeader back={{ href: "/admin/coupons", label: "الكوبونات" }} title="كوبون جديد" />
      <CouponForm
        products={products.filter((p) => p.kind === "standard").map((p) => ({ id: p.id, name: p.name.ar || p.name.en }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name.ar || c.name.en }))}
        value={{ code: "", kind: "percent", value: "", minSubtotal: 0, maxUses: "", startsAt: "", endsAt: "", oncePerCustomer: true, active: true, name: "", source: "", excludeSale: false, scope: "all", productIds: [], categoryIds: [] }}
      />
    </>
  );
}
