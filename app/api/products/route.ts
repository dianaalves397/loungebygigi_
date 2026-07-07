// @ts-nocheck

import { requireAdmin } from "@/lib/auth";
import { upsertProduct, getProducts } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function uniqueProducts(products: any[]) {
  const map = new Map();

  products
    .filter(Boolean)
    .forEach((product) => {
      const key =
        product.id ||
        product.slug ||
        product.printfulSyncProductId ||
        product.providerProductId ||
        product.title;

      if (key) map.set(String(key), product);
    });

  return Array.from(map.values());
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET() {
  const globalCache = globalThis as any;

  let products: any[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Lê diretamente sem unstable_cache para garantir dados sempre frescos.
      // getCachedProducts() tem 6h de TTL e pode devolver dados antigos mesmo
      // depois de revalidateTag — crítico para o painel de controlo.
      const data = await getProducts();
      products = Array.isArray(data) ? data : [];

      if (products.length > 0) break;
    } catch (error) {
      console.error("Erro a carregar produtos:", error);
    }

    await wait(400);
  }

  products = uniqueProducts(products);

  if (products.length > 0) {
    globalCache.__lbg_products_cache = products;
  }

  if (!products.length && Array.isArray(globalCache.__lbg_products_cache)) {
    products = globalCache.__lbg_products_cache;
  }

  return Response.json(products, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const product = await req.json();
    const saved = await upsertProduct(product);

    return Response.json(saved || product, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Erro ao guardar produto." },
      { status: 500 }
    );
  }
}
