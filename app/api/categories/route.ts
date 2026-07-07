export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireAdmin } from "@/lib/auth";
import { getCategories, saveCategories, slugify } from "@/lib/db";
import { getSettings, saveSettings } from "@/lib/settings";

function cleanId(value: string) {
  return slugify(String(value || ""));
}

function normalizeCategory(category: any) {
  const id = cleanId(category.id || category.name || category.title || "");

  return {
    ...category,
    id,
    name: category.name || category.title || id,
    parentId: cleanId(category.parentId || "") === id ? "" : cleanId(category.parentId || ""),
    gender: category.gender || "unisex",
    mediaType: category.mediaType || "image",
    image: category.image || "",
    featured: category.featured !== false,
    hidden: Boolean(category.hidden),
    sortOrder: Number(category.sortOrder || 999),
    introTitle: category.introTitle || "",
    introText: category.introText || "",
    styles: Array.isArray(category.styles)
      ? category.styles
      : String(category.styles || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
  };
}

function isSupplierCategory(category: any) {
  const id = cleanId(category.id || "");
  const name = cleanId(category.name || "");
  return id === "printful" || id === "printify" || name === "printful" || name === "printify";
}

async function setHiddenId(id: string, hidden: boolean) {
  const clean = cleanId(id);
  const settings = await getSettings();

  const hiddenCategoryIds = new Set(
    (settings.hiddenCategoryIds || [])
      .filter(Boolean)
      .map((value: string) => cleanId(value))
  );

  if (hidden && clean) hiddenCategoryIds.add(clean);
  if (!hidden && clean) hiddenCategoryIds.delete(clean);

  await saveSettings({
    ...settings,
    hiddenCategoryIds: Array.from(hiddenCategoryIds)
  });
}

export async function GET() {
  let categories: any[];
  let settings: any;

  try {
    categories = await getCategories();
    settings = await getSettings();
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Erro ao carregar categorias." },
      { status: 500 }
    );
  }

  const hiddenCategoryIds = new Set(
    (settings.hiddenCategoryIds || [])
      .filter(Boolean)
      .map((value: string) => cleanId(value))
  );

  const fixed = categories
    .map(normalizeCategory)
    .filter((category: any) => category.id || category.name)
    .filter((category: any) => !isSupplierCategory(category))
    .map((category: any) => ({
      ...category,
      hidden: Boolean(
        category.hidden ||
          hiddenCategoryIds.has(cleanId(category.id)) ||
          hiddenCategoryIds.has(cleanId(category.name))
      )
    }));

  const unique = Array.from(
    new Map(fixed.map((category: any) => [cleanId(category.id || category.name), category])).values()
  );

  return Response.json(unique, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
  const incoming = await req.json();

  const originalId = cleanId(
    incoming.originalId ||
      incoming.oldId ||
      incoming.previousId ||
      ""
  );

  const nextCategory = normalizeCategory(incoming);
  const nextId = cleanId(nextCategory.id || nextCategory.name);

  if (!nextId) {
    return Response.json({ error: "Categoria sem ID ou nome." }, { status: 400 });
  }

  if (["printful", "printify"].includes(nextId)) {
    return Response.json(
      { error: "Printful/Printify não podem ser usados como categoria pública." },
      { status: 400 }
    );
  }

  const categories = (await getCategories())
    .map(normalizeCategory)
    .filter((category: any) => category.id || category.name)
    .filter((category: any) => !isSupplierCategory(category));

  let replaced = false;

  const nextCategories = categories.map((category: any) => {
    const categoryId = cleanId(category.id);
    const categoryName = cleanId(category.name);

    if (
      originalId &&
      (categoryId === originalId || categoryName === originalId)
    ) {
      replaced = true;
      return nextCategory;
    }

    if (!originalId && (categoryId === nextId || categoryName === nextId)) {
      replaced = true;
      return nextCategory;
    }

    return category;
  });

  if (!replaced) {
    const duplicateIndex = nextCategories.findIndex((category: any) => {
      const categoryId = cleanId(category.id);
      const categoryName = cleanId(category.name);
      return categoryId === nextId || categoryName === nextId;
    });

    if (duplicateIndex >= 0) nextCategories[duplicateIndex] = nextCategory;
    else nextCategories.push(nextCategory);
  }

  const unique = Array.from(
    new Map(nextCategories.map((category: any) => [cleanId(category.id || category.name), category])).values()
  );

  if (originalId && originalId !== nextId) {
    await setHiddenId(originalId, true);
  }

  await setHiddenId(nextId, Boolean(nextCategory.hidden));
  await saveCategories(unique);

  return Response.json(nextCategory, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Erro ao guardar categoria." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
  const url = new URL(req.url);

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const id = cleanId(
    url.searchParams.get("id") ||
      body.id ||
      body.originalId ||
      body.name ||
      body.title ||
      ""
  );

  const categories = (await getCategories()).map(normalizeCategory);

  const nextCategories = categories
    .map((category: any) => {
      const categoryId = cleanId(category.id);
      const categoryName = cleanId(category.name);

      if (id && (categoryId === id || categoryName === id)) {
        return { ...category, hidden: true };
      }

      return category;
    })
    .filter((category: any) => cleanId(category.id) || cleanId(category.name))
    .filter((category: any) => !isSupplierCategory(category));

  if (id) await setHiddenId(id, true);

  await saveCategories(nextCategories);

  return Response.json(
    { ok: true, hidden: id || "blank-categories" },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    }
  );
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Erro ao apagar categoria." },
      { status: 500 }
    );
  }
}
