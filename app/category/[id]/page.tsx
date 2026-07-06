// Categoria editorial. Inclui produtos das subcategorias.
// Estática + revalidação por tag: sem custo por visita.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ExperienceSwitch from "@/components/category/ExperienceSwitch";

import { getCachedCategories, getCachedProducts } from "@/lib/cache";
import { getDescendantCategoryIds, getChildCategories } from "@/lib/categoryUtils";

export const revalidate = 3600;

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function loadCategory(id: string) {
  const categories = (await getCachedCategories()) as any[];
  return categories.find((category) => String(category.id) === id) || null;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const category = await loadCategory(id);
  if (!category) return { title: "Categoria" };
  return {
    title: category.name,
    description:
      category.introText || `${category.name} — peças selecionadas da Lounge by Gigi.`,
    openGraph: category.image ? { images: [{ url: category.image }] } : undefined
  };
}

function productMatchesAny(product: any, ids: Set<string>) {
  if (ids.has(String(product.categoryId))) return true;
  if ((product.categoryIds || []).some((cid: string) => ids.has(String(cid)))) return true;
  return ids.has(slugify(product.category));
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [categories, allProducts] = await Promise.all([
    getCachedCategories() as Promise<any[]>,
    getCachedProducts() as Promise<any[]>
  ]);

  const category = categories.find((item) => String(item.id) === id) || null;
  if (!category || category.hidden) notFound();

  // categoria + todas as subcategorias
  const familyIds = new Set(getDescendantCategoryIds(categories as any, id));
  const products = allProducts.filter(
    (product) => product.status === "active" && productMatchesAny(product, familyIds)
  );

  // subcategorias diretas, com contagem (inclui as descendentes de cada uma)
  const subcategories = getChildCategories(categories as any, id)
    .filter((sub: any) => !sub.hidden)
    .sort((a: any, b: any) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999))
    .map((sub: any) => {
      const subFamily = new Set(getDescendantCategoryIds(categories as any, sub.id));
      const count = allProducts.filter(
        (product) => product.status === "active" && productMatchesAny(product, subFamily)
      ).length;
      return { id: sub.id, name: sub.name, count };
    });

  const parent = category.parentId
    ? categories.find((item) => String(item.id) === String(category.parentId)) || null
    : null;

  const gender = String(parent?.gender || category.gender || "unisex");
  const backHref = gender === "men" ? "/collections/men" : "/collections/women";

  const sharedProps = {
    category,
    products,
    subcategories,
    backHref,
    parent: parent ? { id: parent.id, name: parent.name } : null
  };

  return (
    <>
      <Nav />
      <main>
        <ExperienceSwitch {...sharedProps} categoryId={String(category.id)} />
      </main>
    </>
  );
}
