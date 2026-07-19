// @ts-nocheck

import Link from "next/link";
import Nav from "@/components/Nav";
import ProductDetailClient from "@/components/ProductDetailClient";
import { slugify, getProducts } from "@/lib/db";
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

async function loadProducts() {
  const cached = await getCachedProducts().catch(() => []);
  return Array.isArray(cached) ? cached : [];
}

// Só usado quando o produto não aparece na lista em cache (ex: acabou de
// ser sincronizado e a cache de 6h ainda não o reflete) — chama getProducts()
// diretamente, sem round-trip HTTP a /api/products, para não pagar o custo de
// uma sincronização ao vivo com os fornecedores em TODAS as visitas normais.
async function loadProductsFresh() {
  try {
    const fresh = await getProducts();
    return Array.isArray(fresh) ? fresh : [];
  } catch {
    return [];
  }
}

export default async function ProductPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const slug = normalize(resolvedParams?.slug);

  let products = await loadProducts();

  let product = products.find((item: any) => {
    return productKeys(item).includes(slug);
  });

  if (!product) {
    // Fallback raro: produto ainda não refletido na cache de 6h.
    products = await loadProductsFresh();
    product = products.find((item: any) => productKeys(item).includes(slug));
  }

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
