export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireAdmin } from "@/lib/auth";
import { getCategories, saveCategories } from "@/lib/db";
import type { Category } from "@/types";

const NEW_SUBCATEGORIES: Category[] = [
  // Sports — women
  { id: "sports-superiores-women", name: "Peças superiores", gender: "women", parentId: "sports", sortOrder: 10, image: "/image_tenis.jpg", mediaType: "image", featured: false, styles: [] },
  { id: "sports-inferiores-women", name: "Peças inferiores", gender: "women", parentId: "sports", sortOrder: 20, image: "/image_tenis.jpg", mediaType: "image", featured: false, styles: [] },
  { id: "sports-conjuntos-women", name: "Conjuntos", gender: "women", parentId: "sports", sortOrder: 30, image: "/image_tenis.jpg", mediaType: "image", featured: false, styles: [] },
  // Sports — men
  { id: "sports-superiores-men", name: "Peças superiores", gender: "men", parentId: "sports", sortOrder: 11, image: "/image_tenis.jpg", mediaType: "image", featured: false, styles: [] },
  { id: "sports-inferiores-men", name: "Peças inferiores", gender: "men", parentId: "sports", sortOrder: 21, image: "/image_tenis.jpg", mediaType: "image", featured: false, styles: [] },
  { id: "sports-conjuntos-men", name: "Conjuntos", gender: "men", parentId: "sports", sortOrder: 31, image: "/image_tenis.jpg", mediaType: "image", featured: false, styles: [] },
  // Loungewear — women
  { id: "lounge-superiores-women", name: "Peças superiores", gender: "women", parentId: "loungewear", sortOrder: 10, image: "/mood-couple.jpg", mediaType: "image", featured: false, styles: [] },
  { id: "lounge-inferiores-women", name: "Peças inferiores", gender: "women", parentId: "loungewear", sortOrder: 20, image: "/mood-couple.jpg", mediaType: "image", featured: false, styles: [] },
  { id: "lounge-conjuntos-women", name: "Conjuntos", gender: "women", parentId: "loungewear", sortOrder: 30, image: "/mood-couple.jpg", mediaType: "image", featured: false, styles: [] },
  // Loungewear — men
  { id: "lounge-superiores-men", name: "Peças superiores", gender: "men", parentId: "loungewear", sortOrder: 11, image: "/mood-couple.jpg", mediaType: "image", featured: false, styles: [] },
  { id: "lounge-inferiores-men", name: "Peças inferiores", gender: "men", parentId: "loungewear", sortOrder: 21, image: "/mood-couple.jpg", mediaType: "image", featured: false, styles: [] },
  { id: "lounge-conjuntos-men", name: "Conjuntos", gender: "men", parentId: "loungewear", sortOrder: 31, image: "/mood-couple.jpg", mediaType: "image", featured: false, styles: [] },
  // Summer
  { id: "summer-roupa", name: "Roupa", gender: "unisex", parentId: "summer", sortOrder: 10, image: "/image_casal_barco.jpg", mediaType: "image", featured: false, styles: [] },
  { id: "summer-banho", name: "Banho", gender: "unisex", parentId: "summer", sortOrder: 20, image: "/image_casal_barco.jpg", mediaType: "image", featured: false, styles: [] },
];

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const existing = await getCategories();
  const existingIds = new Set(existing.map((c) => String(c.id)));

  const toAdd = NEW_SUBCATEGORIES.filter((c) => !existingIds.has(c.id));
  const merged: Category[] = [...existing, ...toAdd];

  await saveCategories(merged);

  return Response.json({
    ok: true,
    added: toAdd.length,
    addedIds: toAdd.map((c) => c.id),
    total: merged.length
  });
}
