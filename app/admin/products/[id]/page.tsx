import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { adminCategories, adminProduct } from "@/lib/admin";
import { adminUser } from "@/lib/auth";

export const metadata: Metadata = { title: "تعديل منتج" };

export default async function EditProduct({ params }: PageProps<"/admin/products/[id]">) {
  if (!(await adminUser())) return null;
  const { id } = await params;
  const [p, categories] = await Promise.all([adminProduct(id), adminCategories()]);
  if (!p) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: "المنتجات" }} title={p.name.ar || p.name.en} subtitle="تعديل المنتج" />
      <ProductForm
        uploads={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)}
        categories={categories.map((c) => ({ id: c.id, name: c.name.ar || c.name.en }))}
        value={{
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          categoryId: p.categoryId,
          imageUrl: p.imageUrl ?? "",
          art: p.art,
          sort: p.sort,
          active: p.active,
        }}
      />
    </>
  );
}
