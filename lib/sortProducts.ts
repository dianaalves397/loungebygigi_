export const SORT_OPTIONS = [
  { value: "", label: "Recomendados" },
  { value: "price-asc", label: "Preço: mais baixo" },
  { value: "price-desc", label: "Preço: mais alto" },
  { value: "newest", label: "Novidades" }
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export function sortProducts<T extends { price?: number; createdAt?: string }>(
  products: T[],
  sort: string | null | undefined
): T[] {
  if (!sort) return products;

  const list = [...products];

  if (sort === "price-asc") {
    return list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }

  if (sort === "price-desc") {
    return list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }

  if (sort === "newest") {
    return list.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
  }

  return list;
}
