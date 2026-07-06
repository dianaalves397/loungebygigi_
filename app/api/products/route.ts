// @ts-nocheck

import { requireAdmin } from "@/lib/auth";
import { upsertProduct } from "@/lib/db";
import { getCachedProducts } from "@/lib/cache";

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
      const data = await getCachedProducts();
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

  const product = await req.json();
  const saved = await upsertProduct(product);

  return Response.json(saved || product, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}
