import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getWixConfig, testWixConnection } from "@/lib/wix";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const settings = await getSettings();
    const result = await testWixConnection(getWixConfig(settings));
    return Response.json({
      message: `Ligação Wix OK. Produtos encontrados: ${result.count}`,
      ...result
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Erro na ligação Wix." },
      { status: 500 }
    );
  }
}

