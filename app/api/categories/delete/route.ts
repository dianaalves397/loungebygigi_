export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireAdmin } from "@/lib/auth";
import { getCategories, saveCategories, slugify } from "@/lib/db";
import { getSettings, saveSettings } from "@/lib/settings";

function cleanId(value: string) {
  return slugify(String(value || ""));
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const rawId =
    body.id ||
    body.originalId ||
    body.name ||
    body.title ||
    "";

  const id = cleanId(rawId);

  const categories = await getCategories();

  let nextCategories;

  if (id) {
    nextCategories = categories.filter((category: any) => {
      const categoryId = cleanId(category.id);
      const categoryName = cleanId(category.name);

      return categoryId !== id && categoryName !== id;
    });

    const settings = await getSettings();
    const hiddenCategoryIds = new Set(
      (settings.hiddenCategoryIds || [])
        .filter(Boolean)
        .map((value: string) => cleanId(value))
    );

    hiddenCategoryIds.add(id);

    await saveSettings({
      ...settings,
      hiddenCategoryIds: Array.from(hiddenCategoryIds)
    });
  } else {
    nextCategories = categories.filter((category: any) => {
      const categoryId = cleanId(category.id);
      const categoryName = cleanId(category.name);

      return categoryId || categoryName;
    });
  }

  await saveCategories(nextCategories);

  return Response.json({ ok: true, deleted: id || "blank-categories" });
}
