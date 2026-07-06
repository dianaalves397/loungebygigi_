import { getCategories, saveCategories } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const nextCategories = categories.filter(
    (category: any) => String(category.id) !== String(id)
  );

  await saveCategories(nextCategories as any);

  return Response.json({
    ok: true,
    deletedId: id,
    before: categories.length,
    after: nextCategories.length
  });
}
