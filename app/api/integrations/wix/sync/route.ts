import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getWixConfig, queryWixProducts, deriveWixCategories } from "@/lib/wix";
import { saveProducts, saveCategories } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const settings = await getSettings();
    const config = getWixConfig(settings);
    const products = await queryWixProducts(config);
    const categories = await deriveWixCategories(products);

    await saveProducts(products);
    await saveCategories(categories);

    return Response.json({
      message: `${products.length} produtos e ${categories.length} categorias sincronizados da Wix.`
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Erro ao sincronizar Wix." },
      { status: 500 }
    );
  }
}

