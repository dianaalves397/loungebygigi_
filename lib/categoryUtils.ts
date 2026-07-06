export const getCategoryTheme = (category: { name: string; id: string }) => {
  const fullText = (category.name + category.id).toLowerCase();
  if (fullText.includes('beach') || fullText.includes('summer')) return { theme: 'Summer', slug: 'summer' };
  if (fullText.includes('sports')) return { theme: 'Sports', slug: 'sports' };
  if (fullText.includes('lounge')) return { theme: 'Loungewear', slug: 'loungewear' };
  return { theme: 'Add-ons', slug: 'add-ons' };
};


// ---------------- Subcategorias ----------------

type AnyCategory = { id: string; parentId?: string };

// IDs da categoria + todas as descendentes (subcategorias, sub-sub, etc.)
export function getDescendantCategoryIds(categories: AnyCategory[], rootId: string): string[] {
  const ids = new Set<string>([String(rootId)]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const category of categories) {
      const parent = String(category.parentId || "");
      if (parent && ids.has(parent) && !ids.has(String(category.id))) {
        ids.add(String(category.id));
        changed = true;
      }
    }
  }

  return Array.from(ids);
}

export function getChildCategories<T extends AnyCategory>(categories: T[], parentId: string): T[] {
  return categories.filter((category) => String(category.parentId || "") === String(parentId));
}

// Ordena pais seguidos dos filhos (para menus)
export function orderWithChildren<T extends AnyCategory & { sortOrder?: number }>(categories: T[]): T[] {
  const bySort = (a: T, b: T) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999);
  const parents = categories.filter((category) => !category.parentId).sort(bySort);
  const result: T[] = [];

  for (const parent of parents) {
    result.push(parent);
    result.push(...getChildCategories(categories, parent.id).sort(bySort));
  }

  // órfãos (pai escondido/apagado) no fim
  for (const category of categories) {
    if (!result.includes(category)) result.push(category);
  }

  return result;
}
