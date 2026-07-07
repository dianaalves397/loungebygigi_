export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireAdmin } from "@/lib/auth";
import { writeStore } from "@/lib/store";

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  // Tenta receber produtos do body (enviados pelo browser via console)
  let bodyProducts: any[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body) && body.length > 0) {
      bodyProducts = body;
    }
  } catch {}

  // Fallback: cache global do Lambda (pode já estar em 4)
  const globalCache = globalThis as any;
  const cacheProducts: any[] = Array.isArray(globalCache.__lbg_products_cache)
    ? globalCache.__lbg_products_cache
    : [];

  const source = bodyProducts.length > 0 ? bodyProducts : cacheProducts;

  const local = source.filter(
    (p: any) =>
      p?.id &&
      !String(p.id).startsWith("printful-") &&
      !String(p.id).startsWith("printify-") &&
      p.source !== "printful" &&
      p.source !== "printify"
  );

  if (local.length === 0) {
    return Response.json({
      ok: false,
      message: "Nenhum produto encontrado. Body vazio e cache global também vazia.",
      bodyReceived: bodyProducts.length,
      cacheFound: cacheProducts.length
    }, { status: 400 });
  }

  await writeStore("products", local);

  return Response.json({
    ok: true,
    message: `${local.length} produtos recuperados e guardados no Supabase.`,
    localFound: local.length,
    ids: local.map((p: any) => p.id)
  });
}
