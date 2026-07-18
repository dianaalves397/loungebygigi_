// @ts-nocheck

import Link from "next/link";
import { headers } from "next/headers";
import Nav from "@/components/Nav";
import ProductDetailClient from "@/components/ProductDetailClient";
import { slugify } from "@/lib/db";
import { getCachedProducts } from "@/lib/cache";

export const revalidate = 3600;

function normalize(value: any) {
  return slugify(
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
  );
}

function productKeys(product: any) {
  return [
    product.id,
    product.slug,
    product.title,
    product.name,
    product.providerProductId,
    product.providerVariantId,
    product.printfulSyncProductId,
    product.printfulSyncVariantId,
    product.printifyProductId,
    product.printifyVariantId,
    normalize(product.title),
    normalize(product.name),
    normalize(product.slug)
  ]
    .filter(Boolean)
    .map((value) => normalize(value));
}

async function getProductsFromApi() {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");

    if (!host) return [];

    const protocol = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const url = `${protocol}://${host}/api/products`;

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-store"
      }
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function loadProducts() {
  // Junta as duas fontes em vez de confiar só numa: se a chamada "fresca"
  // à API vier incompleta (ex: um produto falhou momentaneamente a buscar
  // detalhes a um fornecedor), o produto continua encontrável através da
  // lista em cache que a loja já usa — antes, um resultado não-vazio mas
  // incompleto fazia a página nunca chegar a consultar a cache.
  const [fromApi, fromDb] = await Promise.all([
    getProductsFromApi(),
    getCachedProducts().catch(() => [])
  ]);

  const merged = new Map<string, any>();
  for (const product of [...(Array.isArray(fromDb) ? fromDb : []), ...fromApi]) {
    if (product?.id) merged.set(String(product.id), product);
  }

  return Array.from(merged.values());
}

export default async function ProductPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const slug = normalize(resolvedParams?.slug);

  const products = await loadProducts();

  const product = products.find((item: any) => {
    return productKeys(item).includes(slug);
  });

  if (!product) {
    return (
      <>
        <Nav />

        <main className="section">
          <p className="eyebrow">produto</p>
          <h1>Produto não encontrado</h1>

          <p style={{ maxWidth: 520, marginTop: 12, opacity: 0.7 }}>
            Este produto pode ter mudado de nome ou ainda não estar sincronizado.
          </p>

          <Link className="pill dark-pill" href="/shop?gender=women">
            Voltar à loja
          </Link>
        </main>
      </>
    );
  }

  const related = products
    .filter((item: any) => item.id !== product.id)
    .filter((item: any) => String(item.status || "active") === "active")
    .filter((item: any) => {
      if (product.categoryId && item.categoryId === product.categoryId) return true;
      if (product.category && item.category === product.category) return true;
      return false;
    })
    .slice(0, 4);

  return (
    <>
      <Nav />
      <ProductDetailClient product={product} related={related} />
    </>
  );
}
