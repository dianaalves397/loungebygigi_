import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getPrintkkConfig, testPrintkkConnection } from "@/lib/printkk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const result = await testPrintkkConnection(getPrintkkConfig(await getSettings()));
    return Response.json({
      message: "Ligação PrintKK OK.",
      ...result
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Erro PrintKK" }, { status: 500 });
  }
}
