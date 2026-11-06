import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { adminCategories } from "@/lib/admin";
import { adminUser } from "@/lib/auth";

export const metadata: Metadata = { title: "منتج جديد" };

export default async function NewProduct({ searchParams }: PageProps<"/admin/products/new">) {
  if (!(await adminUser())) return null;
  const sp = await searchParams;
  const categories = await adminCategories();
  const preset = typeof sp.category === "string" && categories.some((c) => c.id === sp.category) ? sp.category : (categories[0]?.id ?? "");
  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: "المنتجات" }} title="منتج جديد" />
      <ProductForm
        uploads={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)}
        categories={categories.map((c) => ({ id: c.id, name: c.name.ar || c.name.en }))}
        value={{
          name: { ar: "", he: "", en: "" },
          description: { ar: "", he: "", en: "" },
          price: 200,
          categoryId: preset,
          imageUrl: "",
          art: { style: "classic", map: "natural", tone: "petal" },
          sort: 0,
          active: true,
        }}
      />
    </>
  );
}
