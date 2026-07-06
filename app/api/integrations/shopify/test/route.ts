import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getShopifyConfig, testShopifyConnection } from "@/lib/shopify";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const settings = await getSettings();
    const result = await testShopifyConnection(getShopifyConfig(settings));

    return Response.json({
      message: `Ligação Shopify OK. Produtos encontrados: ${result.count}`,
      ...result
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Erro na ligação Shopify." },
      { status: 500 }
    );
  }
}

