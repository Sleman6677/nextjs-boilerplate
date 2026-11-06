import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferForm } from "@/components/admin/offer-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { adminCategories, adminProducts } from "@/lib/admin";
import { adminOffer } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";

export const metadata: Metadata = { title: "تعديل عرض" };

export default async function EditOffer({ params }: PageProps<"/admin/offers/[id]">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("marketing")) return <NoAccess />;
  const { id } = await params;
  const [offer, products, categories] = await Promise.all([adminOffer(id), adminProducts(), adminCategories()]);
  if (!offer) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/offers", label: "العروض" }} title={offer.name.ar} />
      <OfferForm value={offer} products={products.filter((p) => p.kind === "standard").map((p) => ({ id: p.id, name: p.name.ar || p.name.en }))} categories={categories.map((c) => ({ id: c.id, name: c.name.ar || c.name.en }))} />
    </>
  );
}
