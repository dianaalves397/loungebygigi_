import { getCategories, saveCategories, slugify } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanId(value: string) {
  return slugify(String(value || ""));
}

// Marca o id como escondido nas definições — getCategories() volta a gerar
// uma entrada "fantasma" para qualquer categoria que ainda tenha produtos
// associados, por isso só filtrar a categoria da lista não chega: sem isto,
// a categoria "apagada" reaparecia sozinha assim que a página recarregava.
async function hideCategoryId(id: string) {
  const clean = cleanId(id);
  if (!clean) return;

  const settings = await getSettings();
  const hiddenCategoryIds = new Set(
    (settings.hiddenCategoryIds || []).filter(Boolean).map((value: string) => cleanId(value))
  );
  hiddenCategoryIds.add(clean);

  await saveSettings({ ...settings, hiddenCategoryIds: Array.from(hiddenCategoryIds) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const patch = await req.json();

  const categories = await getCategories();
  const index = categories.findIndex((category: any) => String(category.id) === String(id));

  if (index < 0) {
    return Response.json({ error: "Categoria nao encontrada." }, { status: 404 });
  }

  categories[index] = {
    ...categories[index],
    ...patch,
    id
  };

  await saveCategories(categories as any);

  return Response.json({ ok: true, category: categories[index] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const categories = await getCategories();

  // Marca como escondida em vez de remover da lista: se a categoria ainda
  // tiver produtos associados, getCategories() volta a criar uma entrada
  // para ela a partir desses produtos — marcar "hidden" é o que garante que
  // fica mesmo escondida (da navegação, das páginas e das abas) depois disso.
  const nextCategories = categories
    .map((category: any) => {
      if (String(category.id) === String(id)) {
        return { ...category, hidden: true };
      }
      return category;
    })
    .filter((category: any) => category.id);

  await saveCategories(nextCategories as any);
  await hideCategoryId(id);

  return Response.json({
    ok: true,
    deletedId: id,
    before: categories.length,
    after: nextCategories.length
  });
}
