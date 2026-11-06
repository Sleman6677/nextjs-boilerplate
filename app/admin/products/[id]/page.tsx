import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { adminCategories, adminProducts } from "@/lib/admin";
import { productForEdit } from "@/lib/admin-catalog";
import { staffUser } from "@/lib/auth";
import { uploadsEnabled } from "@/lib/storage";

export const metadata: Metadata = { title: "تعديل منتج" };

export default async function EditProduct({ params }: PageProps<"/admin/products/[id]">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("products")) return <NoAccess />;
  const { id } = await params;
  const [p, categories, products] = await Promise.all([productForEdit(id), adminCategories(), adminProducts()]);
  if (!p) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: "المنتجات" }} title={p.name.ar || p.name.en} subtitle="تعديل المنتج" />
      <ProductForm
        uploads={uploadsEnabled()}
        categories={categories.map((c) => ({ id: c.id, name: c.name.ar || c.name.en }))}
        products={products.filter((x) => x.kind === "standard").map((x) => ({ id: x.id, name: x.name.ar || x.name.en, price: x.price }))}
        value={p}
      />
    </>
  );
}
