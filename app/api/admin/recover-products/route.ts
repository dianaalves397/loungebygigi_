export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireAdmin } from "@/lib/auth";
import { writeStore } from "@/lib/store";

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const globalCache = globalThis as any;
  const cached: any[] = Array.isArray(globalCache.__lbg_products_cache)
    ? globalCache.__lbg_products_cache
    : [];

  // Filtra apenas produtos locais (não de fornecedores)
  const local = cached.filter(
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
      message: "Cache global vazia ou expirada — Lambda foi reciclado. Produtos não recuperáveis por esta via.",
      cachedTotal: cached.length,
      localFound: 0
    });
  }

  await writeStore("products", local);

  return Response.json({
    ok: true,
    message: `${local.length} produtos recuperados da cache e guardados no Supabase.`,
    cachedTotal: cached.length,
    localFound: local.length,
    ids: local.map((p: any) => p.id)
  });
}
