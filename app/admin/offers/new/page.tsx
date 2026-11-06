import type { Metadata } from "next";
import { OfferForm } from "@/components/admin/offer-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { adminCategories, adminProducts } from "@/lib/admin";
import { staffUser } from "@/lib/auth";

export const metadata: Metadata = { title: "عرض جديد" };

export default async function NewOffer() {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("marketing")) return <NoAccess />;
  const [products, categories] = await Promise.all([adminProducts(), adminCategories()]);
  return (
    <>
      <PageHeader back={{ href: "/admin/offers", label: "العروض" }} title="عرض جديد" />
      <OfferForm value={null} products={products.filter((p) => p.kind === "standard").map((p) => ({ id: p.id, name: p.name.ar || p.name.en }))} categories={categories.map((c) => ({ id: c.id, name: c.name.ar || c.name.en }))} />
    </>
  );
}
