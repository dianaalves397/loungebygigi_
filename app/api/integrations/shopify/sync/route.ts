import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { deriveShopifyCategories, getShopifyConfig, queryShopifyProducts } from "@/lib/shopify";
import { saveProducts, saveCategories } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const settings = await getSettings();
    const config = getShopifyConfig(settings);
    const products = await queryShopifyProducts(config);
    const categories = await deriveShopifyCategories(products);

    await saveProducts(products);
    await saveCategories(categories);

    return Response.json({
      message: `${products.length} produtos e ${categories.length} categorias sincronizados da Shopify.`
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Erro ao sincronizar Shopify." },
      { status: 500 }
    );
  }
}

