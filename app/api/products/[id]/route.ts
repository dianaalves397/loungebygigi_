import { getProducts, saveProducts } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const products = await getProducts();
    const target = products.find((product) => product.id === id);

    if (!target) {
      return Response.json({ ok: true });
    }

    if (
      String(target.id).startsWith("printful-") ||
      String(target.id).startsWith("printify-") ||
      String(target.id).startsWith("apliiq-") ||
      target.source === "printful" ||
      target.source === "printify" ||
      target.source === "apliiq"
    ) {
      const settings = await getSettings();
      settings.productOverrides = settings.productOverrides || {};
      settings.productOverrides[id] = {
        ...(settings.productOverrides[id] || {}),
        status: "archived"
      };
      await saveSettings(settings);

      return Response.json({ ok: true, hidden: true });
    }

    await saveProducts(products.filter((product) => product.id !== id));
    return Response.json({ ok: true, deleted: true });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Erro ao apagar produto." },
      { status: 500 }
    );
  }
}

