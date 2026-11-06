import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { adminCategories, adminProducts } from "@/lib/admin";
import { staffUser } from "@/lib/auth";
import { uploadsEnabled } from "@/lib/storage";

export const metadata: Metadata = { title: "منتج جديد" };

export default async function NewProduct({ searchParams }: PageProps<"/admin/products/new">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("products")) return <NoAccess />;
  const sp = await searchParams;
  const [categories, products] = await Promise.all([adminCategories(), adminProducts()]);
  const preset = typeof sp.category === "string" && categories.some((c) => c.id === sp.category) ? sp.category : (categories[0]?.id ?? "");
  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: "المنتجات" }} title="منتج جديد" />
      <ProductForm
        uploads={uploadsEnabled()}
        categories={categories.map((c) => ({ id: c.id, name: c.name.ar || c.name.en }))}
        products={products.filter((p) => p.kind === "standard").map((p) => ({ id: p.id, name: p.name.ar || p.name.en, price: p.price }))}
        value={{
          kind: sp.kind === "gift_card" ? "gift_card" : "standard",
          name: { ar: "", he: "", en: "" },
          description: { ar: "", he: "", en: "" },
          optionsLabel: { ar: "", he: "", en: "" },
          price: 200,
          salePrice: "",
          saleStartsAt: null,
          saleEndsAt: null,
          categoryId: preset,
          images: [],
          art: { style: "classic", map: "natural", tone: "petal" },
          stock: "",
          lowStockThreshold: 3,
          sellWhenOut: false,
          featured: false,
          sort: 0,
          active: true,
          variants: [],
          addons: [],
        }}
      />
    </>
  );
}
