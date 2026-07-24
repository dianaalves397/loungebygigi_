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

function productMatchesAny(product: any, ids: Set<string>, familyNames: Set<string>) {
  if (ids.has(String(product.categoryId))) return true;
  if ((product.categoryIds || []).some((cid: string) => ids.has(String(cid)))) return true;
  if (ids.has(slugify(product.category))) return true;

  // Produtos sem categoryId/categoryIds próprios (ex: ainda por categorizar
  // manualmente, ou sincronizados sem código no título) não devem
  // desaparecer só por não terem um ID exato — como último recurso,
  // compara pelo NOME da categoria, mas só dentro desta família (nunca
  // contra a loja toda, para não repetir a mistura entre categorias
  // homónimas como as duas "Peças superiores").
  const hasOwnCategory =
    Boolean(product.categoryId) || (product.categoryIds || []).length > 0;
  if (hasOwnCategory) return false;

  return familyNames.has(slugify(product.category));
}

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;

  const [categories, allProducts] = await Promise.all([
    getCachedCategories() as Promise<any[]>,
    getCachedProducts() as Promise<any[]>
  ]);

  const category = categories.find((item) => String(item.id) === id) || null;
  if (!category || category.hidden) notFound();

  const parent = category.parentId
    ? categories.find((item) => String(item.id) === String(category.parentId)) || null
    : null;

  // Género efectivo: ?from (vem do link da coleção) > género da categoria > unisex
  const categoryGender = String(parent?.gender || category.gender || "unisex");
  const effectiveGender = (from === "men" || from === "women") ? from : categoryGender;

  function matchesGender(product: any) {
    if (effectiveGender === "unisex") return true;
    const pg = String(product.gender || "unisex");
    return pg === "unisex" || pg === effectiveGender;
  }

  function namesFor(ids: Set<string>) {
    return new Set(
      (categories as any[])
        .filter((cat) => ids.has(String(cat.id)))
        .map((cat) => slugify(cat.name))
        .filter(Boolean)
    );
  }

  // categoria + todas as subcategorias
  const familyIds = new Set(getDescendantCategoryIds(categories as any, id));
  const familyNames = namesFor(familyIds);
  const products = allProducts.filter(
    (product) =>
      product.status === "active" &&
      productMatchesAny(product, familyIds, familyNames) &&
      matchesGender(product)
  );

  // subcategorias diretas, com contagem (inclui as descendentes de cada uma)
  // só as do género efetivo (ou unisexo) — nunca mostra as tabs do outro género
  const subcategories = getChildCategories(categories as any, id)
    .filter((sub: any) => !sub.hidden)
    .filter((sub: any) => {
      const subGender = String(sub.gender || "unisex");
      return effectiveGender === "unisex" || subGender === "unisex" || subGender === effectiveGender;
    })
    .sort((a: any, b: any) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999))
    .map((sub: any) => {
      const subFamily = new Set(getDescendantCategoryIds(categories as any, sub.id));
      const subFamilyNames = namesFor(subFamily);
      const count = allProducts.filter(
        (product) =>
          product.status === "active" &&
          productMatchesAny(product, subFamily, subFamilyNames) &&
          matchesGender(product)
      ).length;
      return { id: sub.id, name: sub.name, count };
    });

  const gender = effectiveGender !== "unisex" ? effectiveGender : categoryGender;
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
