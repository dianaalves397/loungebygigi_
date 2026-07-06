import { Product, Category } from "@/types";
import { slugify } from "@/lib/db";

export function getShopifyConfig(settings: any) {
  const shopify = settings?.integrations?.shopify || {};

  return {
    enabled: Boolean(shopify.enabled),
    storeDomain: shopify.storeDomain || process.env.SHOPIFY_STORE_DOMAIN || "",
    storefrontAccessToken:
      shopify.storefrontAccessToken ||
      process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
      "",
    apiVersion: shopify.apiVersion || process.env.SHOPIFY_API_VERSION || "2025-10",
    useShopifyAsDatabase: shopify.useShopifyAsDatabase !== false
  };
}

function assertStorefrontConfig(config: any) {
  if (!config.storeDomain || !config.storefrontAccessToken) {
    throw new Error("Shopify Store Domain ou Storefront Access Token em falta.");
  }
}

export async function shopifyStorefrontGraphQL<T>(
  config: any,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  assertStorefrontConfig(config);

  const res = await fetch(
    `https://${config.storeDomain}/api/${config.apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.storefrontAccessToken
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store"
    }
  );

  const data = await res.json();

  if (!res.ok || data.errors) {
    throw new Error(JSON.stringify(data.errors || data));
  }

  return data.data as T;
}

type StorefrontProductsData = {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        description: string;
        productType: string;
        tags: string[];
        vendor?: string;
        featuredImage?: { url: string };
        images?: {
          edges: Array<{ node: { url: string } }>;
        };
        variants: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              availableForSale: boolean;
              quantityAvailable?: number | null;
              price: {
                amount: string;
                currencyCode: string;
              };
              compareAtPrice?: {
                amount: string;
                currencyCode: string;
              } | null;
              selectedOptions?: Array<{ name: string; value: string }>;
            };
          }>;
        };
      };
    }>;
  };
};

function cleanShopifyProductId(gid: string) {
  return String(gid).replace("gid://shopify/Product/", "");
}

export function mapShopifyProduct(node: any): Product {
  const variant = node.variants?.edges?.[0]?.node;
  const images =
    node.images?.edges?.map((edge: any) => edge.node.url).filter(Boolean) || [];

  const titleBlob = `${node.title} ${node.productType} ${node.tags?.join(" ")}`.toLowerCase();

  const colors = new Map<string, { name: string; hex: string; stock: number }>();
  const sizes = new Set<string>();

  for (const edge of node.variants?.edges || []) {
    const v = edge.node;
    for (const option of v.selectedOptions || []) {
      const optionName = String(option.name || "").toLowerCase();

      if (
        optionName.includes("color") ||
        optionName.includes("colour") ||
        optionName.includes("cor")
      ) {
        colors.set(option.value, {
          name: option.value,
          hex: "#d8c5b5",
          stock: Number(v.quantityAvailable || 0)
        });
      }

      if (optionName.includes("size") || optionName.includes("tamanho")) {
        sizes.add(option.value);
      }
    }
  }

  const categoryName = node.productType || "Shopify";
  const price = Number(variant?.price?.amount || 0);
  const compareAt = Number(variant?.compareAtPrice?.amount || 0);

  return {
    id: `shopify-${cleanShopifyProductId(node.id)}`,
    slug: node.handle,
    title: node.title,
    categoryId: slugify(categoryName),
    category: categoryName,
    collection: slugify(categoryName),
    gender: titleBlob.includes("men")
      ? "men"
      : titleBlob.includes("women")
      ? "women"
      : "unisex",
    style: node.vendor || node.tags?.[0] || "shopify",
    price,
    compareAt: compareAt > price ? compareAt : 0,
    stock: Number(variant?.quantityAvailable || 0),
    source: "shopify" as any,
    status: variant?.availableForSale === false ? "draft" : "active",
    image:
      node.featuredImage?.url ||
      images[0] ||
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop",
    mediaType: "image",
    gallery: images.length ? images : node.featuredImage?.url ? [node.featuredImage.url] : [],
    description: node.description || "",
    details: node.tags || [],
    colors: Array.from(colors.values()),
    sizes: Array.from(sizes),
    tags: node.tags || [],
    shopifyProductId: node.id,
    shopifyVariantId: variant?.id
  };
}

export async function queryShopifyProducts(config: any): Promise<Product[]> {
  const query = `
    query ProductsForLoungeByGigi($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            tags
            vendor
            featuredImage { url }
            images(first: 8) {
              edges { node { url } }
            }
            variants(first: 30) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  quantityAvailable
                  price { amount currencyCode }
                  compareAtPrice { amount currencyCode }
                  selectedOptions { name value }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyStorefrontGraphQL<StorefrontProductsData>(
    config,
    query,
    { first: 100 }
  );

  return data.products.edges.map(({ node }) => mapShopifyProduct(node));
}

export async function deriveShopifyCategories(products: Product[]): Promise<Category[]> {
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

export async function createShopifyCheckoutUrl({
  config,
  items
}: {
  config: any;
  items: any[];
}) {
  const lines = items.map((item) => {
    const merchandiseId = item.shopifyVariantId || item.variantId;

    if (!merchandiseId) {
      throw new Error(
        "O checkout Shopify precisa de produtos sincronizados da Shopify com variant ID."
      );
    }

    return {
      merchandiseId,
      quantity: Number(item.quantity || 1)
    };
  });

  const mutation = `
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyStorefrontGraphQL<any>(config, mutation, {
    input: { lines }
  });

  const errors = data.cartCreate?.userErrors || [];

  if (errors.length) {
    throw new Error(errors.map((error: any) => error.message).join(", "));
  }

  const checkoutUrl = data.cartCreate?.cart?.checkoutUrl;

  if (!checkoutUrl) {
    throw new Error("A Shopify não devolveu checkoutUrl.");
  }

  return checkoutUrl;
}

export async function testShopifyConnection(config: any) {
  const products = await queryShopifyProducts(config);
  return {
    ok: true,
    count: products.length
  };
}

