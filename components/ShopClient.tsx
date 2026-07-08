// @ts-nocheck

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import SortControl from "@/components/category/SortControl";
import { sortProducts } from "@/lib/sortProducts";

function clean(value: any) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function norm(value: any) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function key(value: any) {
  return norm(value).replace(/\s+/g, "-");
}

function arr(value: any) {
  return Array.isArray(value) ? value : [];
}

const synonyms = [
  ["camisa", "camiseta", "shirt", "tshirt", "t shirt", "tee", "top"],
  ["polo", "polo shirt"],
  ["vestido", "dress"],
  ["saia", "skirt"],
  ["calca", "calcas", "pants", "trousers"],
  ["calcoes", "shorts"],
  ["casaco", "jacket", "coat", "blazer"],
  ["camisola", "sweater", "hoodie", "sweatshirt"],
  ["praia", "beach", "swim", "swimwear", "bikini"],
  ["desporto", "sports", "sport", "fitness", "gym", "pilates"],
  ["saco", "mala", "bag", "handbag"],
  ["oculos", "sunglasses", "glasses"],
  ["joias", "jewelry", "jewellery", "anel", "ring", "colar", "necklace"],
  ["preto", "black"],
  ["branco", "white"],
  ["azul", "blue", "navy"],
  ["vermelho", "red"],
  ["verde", "green"],
  ["rosa", "pink"],
  ["bege", "beige", "nude", "cream"],
  ["cinzento", "cinza", "grey", "gray"],
  ["castanho", "brown"]
];

function searchTerms(query: string) {
  const q = norm(query);
  if (!q) return [];

  const base = q.split(" ").filter(Boolean);
  const set = new Set([q, ...base]);

  synonyms.forEach((group) => {
    const g = group.map(norm);
    const match = g.some((word) => q.includes(word) || base.includes(word));
    if (match) g.forEach((word) => set.add(word));
  });

  return Array.from(set).filter(Boolean);
}

function productText(product: any) {
  return norm([
    product.id,
    product.slug,
    product.title,
    product.name,
    product.description,
    product.category,
    product.categoryId,
    product.collection,
    product.gender,
    product.style,
    product.type,
    product.productType,
    ...arr(product.categoryIds),
    ...arr(product.categories),
    ...arr(product.tags),
    ...arr(product.details),
    ...arr(product.sizes),
    ...arr(product.colors).map((c: any) => typeof c === "string" ? c : c?.name)
  ].filter(Boolean).join(" "));
}

function productCategoryKeys(product: any) {
  return [
    product.category,
    product.categoryId,
    product.collection,
    product.style,
    product.type,
    product.productType,
    ...arr(product.categoryIds),
    ...arr(product.categories),
    ...arr(product.tags)
  ].filter(Boolean).map(key);
}

function productMatchesSearch(product: any, query: string) {
  const q = norm(query);
  if (!q) return true;

  const text = productText(product);
  return searchTerms(query).some((term) => text.includes(term));
}

function productMatchesGender(product: any, gender: string) {
  if (!gender || gender === "all") return true;

  const g = String(product.gender || "").toLowerCase();

  return g === gender || g === "unisex" || g === "";
}

function categoryWantedKeys(categoryParam: string, category: any) {
  return [
    categoryParam,
    category?.id,
    category?.name,
    category?.title,
    category?.originalId
  ].filter(Boolean).map(key);
}

function findCategory(categories: any[], categoryParam: string) {
  const wanted = key(categoryParam);

  return categories.find((cat) => {
    return [cat.id, cat.name, cat.title, cat.originalId].filter(Boolean).map(key).includes(wanted);
  });
}

function descendantIds(categories: any[], rootId: string) {
  const ids = new Set<string>([String(rootId)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      const parent = String(category?.parentId || "");
      if (parent && ids.has(parent) && !ids.has(String(category.id))) {
        ids.add(String(category.id));
        changed = true;
      }
    }
  }
  return Array.from(ids);
}

function productMatchesCategory(
  product: any,
  categoryParam: string,
  category: any,
  allCategories: any[] = []
) {
  if (!categoryParam) return true;

  const wanted = new Set(categoryWantedKeys(categoryParam, category));

  // subcategorias: a categoria-mãe inclui as chaves de todas as descendentes
  if (category?.id) {
    for (const id of descendantIds(allCategories, category.id)) {
      const sub = allCategories.find((item) => String(item.id) === id);
      categoryWantedKeys(id, sub).forEach((wKey) => wanted.add(wKey));
    }
  }

  const productKeys = productCategoryKeys(product);
  return productKeys.some((pKey) => wanted.has(pKey));
}

function ShopClientInner({
  initialGender,
  initialCategory,
  initialQuery
}: {
  initialGender: string;
  initialCategory: string;
  initialQuery: string;
}) {
  // lê o URL ao vivo no cliente — a página /shop mantém-se estática
  // (sem searchParams no servidor não há invocação de função por visita)
  const params = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const gender = String(params.get("gender") || initialGender || "all").toLowerCase();
  const categoryParam = String(params.get("category") || initialCategory || "").trim();
  const query = String(params.get("q") || params.get("search") || initialQuery || "").trim();
  const sort = params.get("sort") || "";

  async function load() {
    setLoading(true);

    try {
      const res = await fetch(`/api/public/catalog`);
      const data = await res.json();

      setProducts(Array.isArray(data?.products) ? data.products : []);
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    } catch {
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [gender, categoryParam, query]);

  const selectedCategory = useMemo(() => {
    return categoryParam ? findCategory(categories, categoryParam) : null;
  }, [categories, categoryParam]);

  const visibleProducts = useMemo(() => {
    const filtered = products
      .filter((product) => String(product.status || "active").toLowerCase() !== "draft")
      .filter((product) => product.hidden !== true)
      .filter((product) => productMatchesGender(product, query ? "all" : gender))
      .filter((product) => productMatchesCategory(product, categoryParam, selectedCategory, categories))
      .filter((product) => productMatchesSearch(product, query));

    return sortProducts(filtered, sort);
  }, [products, categories, gender, categoryParam, selectedCategory, query, sort]);

  const title = selectedCategory
    ? clean(selectedCategory.name || selectedCategory.title || categoryParam)
    : query
      ? "Pesquisa inteligente"
      : "All products";

  return (
    <main className="shop-category-page">
      <section className="shop-category-hero">
        <div>
          <p className="eyebrow">{categoryParam ? "categoria" : query ? "search" : "shop"}</p>

          <h1>{title}</h1>

          <p>
            {categoryParam
              ? "Produtos associados a esta categoria."
              : "Explora todos os produtos disponíveis na loja."}
          </p>

          <form className="smart-search-form" action="/shop">
            {categoryParam ? <input type="hidden" name="category" value={categoryParam} /> : null}
            <input type="hidden" name="gender" value="all" />

            <input
              name="q"
              defaultValue={query}
              placeholder="Pesquisar: camisa, shirt, vestido, dress, beach..."
            />

            <button type="submit">Pesquisar</button>
          </form>

          <div className="shop-category-tabs">
            <Link className={!categoryParam && !query && gender === "all" ? "active" : ""} href="/shop?gender=all">
              All
            </Link>

            <Link className={!categoryParam && !query && gender === "women" ? "active" : ""} href="/shop?gender=women">
              Women
            </Link>

            <Link className={!categoryParam && !query && gender === "men" ? "active" : ""} href="/shop?gender=men">
              Men
            </Link>
          </div>
        </div>
      </section>

      <section className="shop-category-content">
        <div className="shop-category-heading">
          <div>
            <p className="eyebrow">
              {loading ? "a carregar" : `${visibleProducts.length} produto${visibleProducts.length === 1 ? "" : "s"}`}
            </p>

            <p style={{ opacity: 0.55, marginTop: 4 }}>
              API: {products.length} produto{products.length === 1 ? "" : "s"} carregado{products.length === 1 ? "" : "s"}
            </p>
          </div>

          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", alignItems: "center" }}>
            <SortControl />

            <button className="pill" type="button" onClick={load}>
              Atualizar
            </button>

            <Link className="pill" href="/shop?gender=all">
              Todos
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="empty-category-box">
            <p className="eyebrow">a carregar</p>
            <h2>A carregar produtos...</h2>
          </div>
        ) : visibleProducts.length > 0 ? (
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id || product.slug || product.title} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-category-box">
            <p className="eyebrow">sem produtos visíveis</p>
            <h2>Nenhum produto apareceu nesta página.</h2>

            <p>
              A API carregou {products.length} produto{products.length === 1 ? "" : "s"}, mas o filtro atual não deixou nenhum visível.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

export default function ShopClient(props: {
  initialGender: string;
  initialCategory: string;
  initialQuery: string;
}) {
  return (
    <Suspense fallback={null}>
      <ShopClientInner {...props} />
    </Suspense>
  );
}
