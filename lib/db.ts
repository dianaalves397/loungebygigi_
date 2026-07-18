import { unstable_cache } from "next/cache";
import { Product, Category, Order, Customer } from "@/types";
import { getSettings } from "@/lib/settings";
import { readStore, writeStore } from "@/lib/store";
import { getPrintfulConfig, queryPrintfulProducts } from "@/lib/printful";
import { getPrintifyConfig, queryPrintifyProducts } from "@/lib/printify";
import { getApliiqConfig, queryApliiqProducts } from "@/lib/apliiq";
import { detectCategoryFromTitle, stripCategoryCode } from "@/lib/autoCategorize";

export function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Categoriza automaticamente produtos ainda sem categoria (tipicamente vindos
// de um fornecedor recém-sincronizado), usando o código de 3 letras no nome
// do produto. Corre antes de applyOverrides, para que uma escolha manual no
// painel continue sempre a prevalecer sobre a deteção automática.
function applyAutoCategorize(products: Product[]) {
  return products.map((product) => {
    if (product.categoryId) return product;

    const detected = detectCategoryFromTitle(product.title);
    if (!detected) return product;

    return {
      ...product,
      title: stripCategoryCode(product.title),
      categoryId: detected.categoryId,
      category: detected.category,
      categoryIds: [detected.categoryId],
      gender: detected.gender
    };
  });
}

function applyOverrides(products: Product[], settings: any) {
  const overrides = settings.productOverrides || {};

  return products.map((product) => {
    const override = overrides[product.id] || {};
    return {
      ...product,
      ...override,
      gallery: override.gallery?.length ? override.gallery : product.gallery,
      details: override.details?.length ? override.details : product.details,
      colors: override.colors?.length ? override.colors : product.colors,
      sizes: override.sizes?.length ? override.sizes : product.sizes
    };
  });
}

export async function getProducts() {
  const local = await readStore<Product[]>("products", []);
  const settings = await getSettings();
  const products = [...local];

  const printful = getPrintfulConfig(settings);
  if (printful.enabled && printful.useAsProductSource) {
    try {
      // Cache de 6h com tag "store": a Printful deixa de ser consultada a cada
      // visita (era a principal causa do consumo de CPU na Vercel).
      const cachedPrintful = unstable_cache(
        async () => queryPrintfulProducts(printful, settings),
        ["printful-products", String(printful.storeId || "default")],
        { revalidate: 60 * 60 * 6, tags: ["store"] }
      );
      products.push(...(await cachedPrintful()));
    } catch (error) {
      console.error("Erro Printful. A usar produtos guardados.", error);
    }
  }

  const printify = getPrintifyConfig(settings);
  if (printify.enabled && printify.useAsProductSource) {
    try {
      const cachedPrintify = unstable_cache(
        async () => queryPrintifyProducts(printify, settings),
        ["printify-products", String(printify.shopId || "default")],
        { revalidate: 60 * 60 * 6, tags: ["store"] }
      );
      products.push(...(await cachedPrintify()));
    } catch (error) {
      console.error("Erro Printify. A usar produtos guardados.", error);
    }
  }

  const apliiq = getApliiqConfig(settings);
  if (apliiq.enabled && apliiq.useAsProductSource) {
    try {
      const cachedApliiq = unstable_cache(
        async () => queryApliiqProducts(apliiq, settings),
        ["apliiq-products", String(apliiq.apiKey || "default")],
        { revalidate: 60 * 60 * 6, tags: ["store"] }
      );
      products.push(...(await cachedApliiq()));
    } catch (error) {
      console.error("Erro Apliiq. A usar produtos guardados.", error);
    }
  }

  const unique = Array.from(new Map(products.map((p) => [p.id, p])).values());
  return applyOverrides(applyAutoCategorize(unique), settings);
}

export async function saveProducts(products: Product[]) {
  await writeStore(
    "products",
    products.filter(
      (product) =>
        !product.id.startsWith("printful-") &&
        !product.id.startsWith("printify-") &&
        !product.id.startsWith("apliiq-")
    )
  );
}

export async function saveSyncedProducts(products: Product[]) {
  await writeStore("products", products);
}

export async function getCategories() {
  const local = await readStore<Category[]>("categories", []);
  const products = await getProducts();
  const dynamic = new Map<string, Category>();

  for (const product of products) {
    if (!dynamic.has(product.categoryId)) {
      dynamic.set(product.categoryId, {
        id: product.categoryId,
        name: product.category,
        gender: product.gender,
        image: product.image,
        mediaType: product.mediaType,
        featured: true,
        styles: product.style ? [product.style] : []
      });
    } else if (product.style) {
      const category = dynamic.get(product.categoryId)!;
      if (!category.styles.includes(product.style)) category.styles.push(product.style);
    }
  }

  return Array.from(
    new Map([...Array.from(dynamic.values()), ...local].map((c) => [c.id, c])).values()
  );
}

export async function saveCategories(categories: Category[]) {
  await writeStore("categories", categories);
}

export async function getOrders() {
  return readStore<Order[]>("orders", []);
}

export async function saveOrders(orders: Order[]) {
  await writeStore("orders", orders);
}

export async function getCustomers() {
  return readStore<Customer[]>("customers", []);
}

export async function saveCustomers(customers: Customer[]) {
  await writeStore("customers", customers);
}

export async function ensureCategoryForProduct(product: Product) {
  const categories = await getCategories();
  const categoryId =
    product.categoryId || slugify(product.category || product.collection);

  const index = categories.findIndex((category) => category.id === categoryId);

  if (index < 0) {
    categories.push({
      id: categoryId,
      name: product.category || product.collection || "New Category",
      gender: product.gender || "unisex",
      image: product.image,
      mediaType: product.mediaType || "image",
      featured: true,
      styles: product.style ? [product.style] : []
    });
  } else if (product.style && !categories[index].styles.includes(product.style)) {
    categories[index].styles.push(product.style);
  }

  await saveCategories(categories);
  return categoryId;
}

export async function upsertProduct(product: Product) {
  product.categoryId = await ensureCategoryForProduct(product);
  product.createdAt = product.createdAt || new Date().toISOString();

  const products = await readStore<Product[]>("products", []);
  const index = products.findIndex((item) => item.id === product.id);

  if (index >= 0) products[index] = product;
  else products.unshift(product);

  await writeStore("products", products);
  return product;
}

