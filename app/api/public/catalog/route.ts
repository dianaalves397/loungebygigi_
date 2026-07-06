// @ts-nocheck

// Catálogo público para a página /shop (pesquisa e filtros feitos no cliente).
// Usa a mesma camada de cache (getCachedProducts/getCachedCategories) que já
// serve o resto do site: 6h de vida, invalidada por tag assim que algo muda
// no painel. Ao contrário de /api/products e /api/categories (que existem
// para o painel de administração e por isso são force-dynamic/no-store),
// este endpoint é servido do cache — visitas normais à loja não tocam na
// Supabase nem geram uma invocação de função por pedido.

import { getCachedProducts, getCachedCategories } from "@/lib/cache";

export const revalidate = 21600; // 6h — alinhado com a cache central

export async function GET() {
  const [products, categories] = await Promise.all([
    getCachedProducts(),
    getCachedCategories()
  ]);

  return Response.json(
    { products, categories },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400" } }
  );
}
