import { Product, Category } from "@/types";
import { slugify } from "@/lib/db";

const WIX_STORES_APP_ID =
  "1380b703-ce81-ff05-f115-39571d94dfcd";

export function getWixConfig(settings: any) {
  const wix = settings?.integrations?.wix || {};

  return {
    enabled: Boolean(wix.enabled),
    apiKey: wix.apiKey || process.env.WIX_API_KEY || "",
    siteId: wix.siteId || process.env.WIX_SITE_ID || "",
    storeUrl: wix.storeUrl || "",
    storesAppId: wix.storesAppId || WIX_STORES_APP_ID,
    useWixAsDatabase: wix.useWixAsDatabase !== false
  };
}

function wixHeaders(config: any) {
  if (!config.apiKey || !config.siteId) {
    throw new Error("Wix API Key ou Wix Site ID em falta.");
  }

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: config.apiKey,
    "wix-site-id": config.siteId
  };
}

function stripHtml(value?: string) {
  return String(value || "").replace(/<[^>]*>/g, "").trim();
}

function mediaUrl(product: any) {
  const media =
    product.media?.mainMedia?.image?.url ||
    product.media?.items?.[0]?.image?.url ||
    product.media?.itemsInfo?.items?.[0]?.image?.url ||
    product.media?.[0]?.url ||
    "";
  return media || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop";
}

function productPrice(product: any) {
  return Number(
    product.priceData?.price ||
      product.priceData?.discountedPrice ||
      product.price?.price ||
      product.actualPriceRange?.minValue?.amount ||
      product.priceRange?.minValue?.amount ||
      0
  );
}

function productCompareAt(product: any) {
  const price = productPrice(product);
  const compare = Number(
    product.priceData?.compareAtPrice ||
      product.priceData?.fullPrice ||
      product.price?.formatted?.price ||
      0
  );

  return compare > price ? compare : 0;
}

export function mapWixProduct(product: any): Product {
  const name = product.name || product.plainDescription || "Wix Product";
  const categoryName =
    product.productType ||
    product.brand ||
    product.collections?.[0]?.name ||
    "Wix";

  const productId = product.id || product._id;

  const options = product.productOptions || [];
  const colorOption = options.find((option: any) =>
    String(option.name || "").toLowerCase().includes("color")
  );
  const sizeOption = options.find((option: any) =>
    String(option.name || "").toLowerCase().includes("size")
  );

  const colors =
    colorOption?.choices?.map((choice: any) => ({
      name: choice.description || choice.value || choice.name,
      hex: choice.value?.startsWith("#") ? choice.value : "#d8c5b5",
      stock: Number(product.inventory?.quantity || 0)
    })) || [];

  const sizes =
    sizeOption?.choices?.map(
      (choice: any) => choice.description || choice.value || choice.name
    ) || [];

  return {
    id: `wix-${productId}`,
    slug: product.slug || slugify(name),
    title: name,
    categoryId: slugify(categoryName),
    category: categoryName,
    collection: slugify(categoryName),
    gender: String(name + " " + categoryName).toLowerCase().includes("men")
      ? "men"
      : String(name + " " + categoryName).toLowerCase().includes("women")
      ? "women"
      : "unisex",
    style: product.brand || "wix",
    price: productPrice(product),
    compareAt: productCompareAt(product),
    stock: Number(
      product.inventory?.quantity ||
        product.inventory?.quantityInStock ||
        product.stock?.quantity ||
        0
    ),
    source: "supplier" as any,
    status: product.visible === false ? "draft" : "active",
    image: mediaUrl(product),
    mediaType: "image",
    gallery: [mediaUrl(product)],
    description: stripHtml(product.description || product.plainDescription),
    details: product.additionalInfoSections?.map((section: any) =>
      stripHtml(section.description || section.title)
    ) || [],
    colors,
    sizes,
    tags: ["wix", ...(product.tags || [])]
  };
}

export async function queryWixProducts(config: any): Promise<Product[]> {
  const res = await fetch("https://www.wixapis.com/stores/v3/products/query", {
    method: "POST",
    headers: wixHeaders(config),
    body: JSON.stringify({
      query: {
        filter: {
          visible: { "$eq": true }
        },
        sort: [{ fieldName: "createdDate", order: "DESC" }],
        cursorPaging: { limit: 100 }
      }
    }),
    cache: "no-store"
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.details || `Erro Wix Products: ${res.status}`);
  }

  const products = data.products || data.items || [];
  return products.map(mapWixProduct);
}

export async function deriveWixCategories(products: Product[]): Promise<Category[]> {
  const map = new Map<string, Category>();

  for (const product of products) {
    if (!map.has(product.categoryId)) {
      map.set(product.categoryId, {
        id: product.categoryId,
        name: product.category,
        gender: product.gender,
        image: product.image,
        mediaType: product.mediaType,
        featured: true,
        styles: product.style ? [product.style] : []
      });
    } else if (product.style) {
      const category = map.get(product.categoryId)!;
      if (!category.styles.includes(product.style)) category.styles.push(product.style);
    }
  }

  return Array.from(map.values());
}

function wixCatalogItemId(productId: string) {
  return productId.startsWith("wix-") ? productId.replace("wix-", "") : productId;
}

export async function createWixCheckoutUrl({
  config,
  items,
  buyerEmail
}: {
  config: any;
  items: any[];
  buyerEmail?: string;
}) {
  if (!items.every((item) => String(item.productId || "").startsWith("wix-"))) {
    throw new Error("O checkout Wix só aceita produtos sincronizados da Wix.");
  }

  const lineItems = items.map((item) => ({
    quantity: Number(item.quantity || 1),
    catalogReference: {
      appId: config.storesAppId || WIX_STORES_APP_ID,
      catalogItemId: wixCatalogItemId(item.productId)
    }
  }));

  const checkoutRes = await fetch("https://www.wixapis.com/ecom/v1/checkouts", {
    method: "POST",
    headers: wixHeaders(config),
    body: JSON.stringify({
      lineItems,
      checkoutInfo: {
        buyerInfo: buyerEmail ? { email: buyerEmail } : undefined
      }
    }),
    cache: "no-store"
  });

  const checkoutData = await checkoutRes.json();

  if (!checkoutRes.ok) {
    throw new Error(checkoutData?.message || `Erro ao criar checkout Wix: ${checkoutRes.status}`);
  }

  const checkoutId =
    checkoutData.checkout?.id ||
    checkoutData.id ||
    checkoutData.checkoutId;

  if (!checkoutId) {
    throw new Error("A Wix não devolveu checkoutId.");
  }

  const urlRes = await fetch(
    `https://www.wixapis.com/ecom/v1/checkouts/${checkoutId}/checkout-url`,
    {
      method: "GET",
      headers: wixHeaders(config),
      cache: "no-store"
    }
  );

  const urlData = await urlRes.json();

  if (!urlRes.ok) {
    throw new Error(urlData?.message || `Erro ao obter checkout URL Wix: ${urlRes.status}`);
  }

  return (
    urlData.checkoutUrl ||
    urlData.url ||
    urlData.checkout?.checkoutUrl
  );
}

export async function testWixConnection(config: any) {
  const products = await queryWixProducts(config);
  return {
    ok: true,
    count: products.length
  };
}

