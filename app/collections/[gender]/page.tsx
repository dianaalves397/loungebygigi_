// Moodboard de coleção (women / men) — só categorias de topo;
// as subcategorias vivem dentro das páginas das categorias.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import MoodboardGrid from "@/components/moodboard/MoodboardGrid";
import { getCachedCategories, getCachedProducts, getCachedPublicSettings } from "@/lib/cache";
import { getDescendantCategoryIds } from "@/lib/categoryUtils";

export const revalidate = 3600;

const GENDERS = new Set(["women", "men"]);

// Imagens por género das categorias de topo (unisex) — usadas quando a
// categoria ainda não tem imageWomen/imageMen definido na base de dados,
// para que a troca funcione de imediato após o deploy, sem depender de uma
// migração de dados.
const DEFAULT_GENDER_IMAGES: Record<string, { women: string; men: string }> = {
  sports: { women: "/sports-women.jpg", men: "/sports-men.png" },
  summer: { women: "/summer-women.jpg", men: "/summer-men.jpg" },
  loungewear: { women: "/lounge-women.jpg", men: "/lounge-men.jpg" },
  acessorios: { women: "/acessorios-women.jpg", men: "/acessorios-men.jpg" }
};

export function generateStaticParams() {
  return [{ gender: "women" }, { gender: "men" }];
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ gender: string }>;
}): Promise<Metadata> {
  const { gender } = await params;
  const label = gender === "men" ? "Man" : "Woman";
  return {
    title: `${label} — Coleções`,
    description: `Coleção ${label} da Lounge by Gigi: categorias selecionadas com espírito editorial.`
  };
}

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default async function CollectionsPage({
  params
}: {
  params: Promise<{ gender: string }>;
}) {
  const { gender } = await params;
  if (!GENDERS.has(gender)) notFound();

  const [categories, products, settings] = await Promise.all([
    getCachedCategories() as Promise<any[]>,
    getCachedProducts() as Promise<any[]>,
    getCachedPublicSettings()
  ]);

  const countFor = (id: string) => {
    const family = new Set(getDescendantCategoryIds(categories as any, id));
    return products.filter((product: any) => {
      if (product.status !== "active") return false;
      // Filtra também pelo género da coleção actual
      const pg = String(product.gender || "unisex");
      if (pg !== "unisex" && pg !== gender) return false;
      if (family.has(String(product.categoryId))) return true;
      if ((product.categoryIds || []).some((cid: string) => family.has(String(cid)))) return true;
      return family.has(slugify(product.category));
    }).length;
  };

  const visible = categories
    .filter((category: any) => {
      const id = String(category.id || "").toLowerCase();
      const name = String(category.name || "").toLowerCase();
      if (category.hidden) return false;
      if (category.parentId) return false; // subcategorias não aparecem no moodboard
      if (["printful", "printify"].includes(id) || ["printful", "printify"].includes(name)) return false;
      const categoryGender = String(category.gender || "unisex").toLowerCase();
      if (gender === "men" && category.showInMenTab === false) return false;
      if (gender === "women" && category.showInWomenTab === false) return false;
      return categoryGender === gender || categoryGender === "unisex";
    })
    .sort((a: any, b: any) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999))
    .map((category: any) => {
      const defaults = DEFAULT_GENDER_IMAGES[String(category.id)];
      const genderImage =
        gender === "men"
          ? category.imageMen || defaults?.men
          : category.imageWomen || defaults?.women;

      return {
        id: category.id,
        name: category.name,
        image: genderImage || category.image,
        introTitle: category.introTitle,
        count: countFor(category.id)
      };
    });

  const label = gender === "men" ? "Man" : "Woman";
  const brand = settings.brand?.name || "Lounge by Gigi";

  return (
    <>
      <Nav />
      <main className="lgm-page">
        <header className="lgm-head">
          <p className="lgm-kicker">Lounge by Gigi — coleções</p>
          <h1>{label}</h1>
        </header>

        <MoodboardGrid categories={visible} brand={brand} label={label} gender={gender} />
      </main>
    </>
  );
}
