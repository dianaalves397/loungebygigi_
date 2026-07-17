// @ts-nocheck

import { Product } from "@/types";

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function cleanText(value: any) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPrintfulConfig(settings: any) {
  const config = settings?.integrations?.printful || {};

  return {
    enabled: Boolean(config.enabled),
    apiToken: config.apiToken || "",
    storeId: config.storeId || "",
    useAsProductSource: config.useAsProductSource !== false,
    autoSubmitOrders: config.autoSubmitOrders !== false
  };
}

function getHeaders(config: any) {
  if (!config.apiToken) throw new Error("Printful API Token em falta.");

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${config.apiToken}`);
  headers.set("Content-Type", "application/json");

  if (config.storeId) {
    headers.set("X-PF-Store-Id", String(config.storeId));
  }

  return headers;
}

async function pf(config: any, path: string) {
  const res = await fetch(`https://api.printful.com${path}`, {
    headers: getHeaders(config),
    cache: "no-store"
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || `Erro Printful: ${res.status}`);
  }

  return data;
}

function price(base: number, settings: any) {
  if (settings?.pricing?.mode === "margin") {
    return Number((base * (1 + Number(settings?.pricing?.marginPercent || 40) / 100)).toFixed(2));
  }

  return Number(base || 0);
}

function isBadPrintfulImage(value: string) {
  const text = String(value || "").toLowerCase();

  return (
    text.includes("label") ||
    text.includes("inside") ||
    text.includes("detail") ||
    text.includes("details") ||
    text.includes("stitch") ||
    text.includes("size-guide") ||
    text.includes("size_guide") ||
    text.includes("guide") ||
    text.includes("embroidery") ||
    text.includes("packaging") ||
    text.includes("thread") ||
    text.includes("closeup") ||
    text.includes("close-up") ||
    text.includes("neck-label") ||
    text.includes("back-neck") ||
    text.includes("texture") ||
    text.includes("fabric") ||
    text.includes("pattern") ||
    text.includes("macro") ||
    text.includes("zoom") ||
    text.includes("seam") ||
    text.includes("hem") ||
    text.includes("fold") ||
    text.includes("folded") ||
    text.includes("wrinkle") ||
    text.includes("wrinkles") ||
    text.includes("close") ||
    text.includes("stitching")
  );
}

function cleanGallery(images: string[]) {
  const clean = Array.from(
    new Set(
      images
        .filter(Boolean)
        .map((image) => String(image).trim())
        .filter(Boolean)
        .filter((image) => !isBadPrintfulImage(image))
    )
  );

  if (clean.length <= 24) return clean; return clean.slice(0, 24);
}

function extractSize(value: string) {
  const match = String(value || "").match(/\b(xs|s|m|l|xl|xxl|2xl|3xl|4xl|5xl)\b/i);
  return match ? match[0].toUpperCase() : "";
}

const colorMap: Record<string, { name: string; hex: string }> = {
  "black": { name: "Black", hex: "#111111" },
  "white": { name: "White", hex: "#ffffff" },
  "navy": { name: "Navy", hex: "#1f2a44" },
  "red": { name: "Red", hex: "#b42318" },
  "blue": { name: "Blue", hex: "#2f5f9f" },
  "green": { name: "Green", hex: "#3d6b45" },
  "grey": { name: "Grey", hex: "#8b8b8b" },
  "gray": { name: "Grey", hex: "#8b8b8b" },
  "pink": { name: "Pink", hex: "#e7a7b5" },
  "beige": { name: "Beige", hex: "#d8c3a5" },
  "brown": { name: "Brown", hex: "#6b4a35" },
  "cream": { name: "Cream", hex: "#f1e7d0" },
  "khaki": { name: "Khaki", hex: "#b8aa83" },
  "sand": { name: "Sand", hex: "#d7c2a1" },
  "natural": { name: "Natural", hex: "#e8dcc8" },
  "maroon": { name: "Maroon", hex: "#6f263d" },
  "purple": { name: "Purple", hex: "#6b4c8f" },
  "yellow": { name: "Yellow", hex: "#e6c84f" },
  "orange": { name: "Orange", hex: "#d9822b" },
  "olive": { name: "Olive", hex: "#6b6f3f" },
  "charcoal": { name: "Charcoal", hex: "#3b3b3b" },
  "heather": { name: "Heather", hex: "#9a9a9a" },
  "ash": { name: "Ash", hex: "#d6d2c8" }
};

function extractColorName(value: string) {
  const text = String(value || "").toLowerCase();

  const keys = Object.keys(colorMap).sort((a, b) => b.length - a.length);
  const found = keys.find((key) => text.includes(key));

  return found ? colorMap[found].name : "";
}

function colorHex(name: string) {
  const found = Object.values(colorMap).find(
    (item) => item.name.toLowerCase() === String(name || "").toLowerCase()
  );

  return found?.hex || "";
}

function variantText(variant: any) {
  return [
    variant?.name,
    variant?.color,
    variant?.color_name,
    variant?.size,
    variant?.variant?.name,
    variant?.variant?.color,
    variant?.variant?.size,
    JSON.stringify(variant?.options || {})
  ]
    .filter(Boolean)
    .join(" ");
}

function getVariantColor(variant: any) {
  const direct = String(
    variant?.color ||
      variant?.color_name ||
      variant?.variant?.color ||
      ""
  ).trim();

  if (direct) {
    const clean = direct.charAt(0).toUpperCase() + direct.slice(1);
    return clean;
  }

  return extractColorName(variantText(variant));
}

function getVariantSize(variant: any) {
  const direct = String(variant?.size || variant?.variant?.size || "").trim();
  if (direct) return direct.toUpperCase();

  return extractSize(variantText(variant));
}

async function getAllPrintfulSyncProducts(config: any) {
  const all: any[] = [];
  const limit = 100;
  let offset = 0;

  for (let page = 0; page < 50; page++) {
    const data = await pf(config, `/sync/products?limit=${limit}&offset=${offset}`);

    const items = Array.isArray(data?.result) ? data.result : [];
    all.push(...items);

    const total = Number(data?.paging?.total || 0);

    if (!items.length) break;
    if (items.length < limit) break;
    if (total && all.length >= total) break;

    offset += limit;
  }

  return all;
}

export async function queryPrintfulStores(config: any) {
  const data = await pf(config, "/stores");
  return data.result || [];
}

export async function queryPrintfulProducts(config: any, settings: any): Promise<Product[]> {
  const list = await getAllPrintfulSyncProducts(config);
  const products: Product[] = [];

  for (const p of list) {
    let detail: any = null;

    try {
      detail = (await pf(config, `/sync/products/${p.id}`)).result;
    } catch {
      detail = null;
    }

    const variants = detail?.sync_variants || [];
    const firstVariant = variants[0];

    const variantOptions = variants.map((variant: any) => {
      const color = getVariantColor(variant);
      const size = getVariantSize(variant);
      const retail = Number(variant?.retail_price || 0);
      const cost = Number(variant?.cost || 0);

      const images = cleanGallery(
        (variant.files || [])
          .filter((file: any) => {
            const blob = [
              file.type,
              file.filename,
              file.preview_url,
              file.thumbnail_url
            ].join(" ");

            if (!file.preview_url && !file.thumbnail_url) return false;
            if (isBadPrintfulImage(blob)) return false;

            return true;
          })
          .map((file: any) => file.preview_url || file.thumbnail_url)
          .filter(Boolean)
      );

      return {
        id: String(variant?.id || ""),
        syncVariantId: String(variant?.id || ""),
        providerVariantId: String(variant?.id || ""),
        color,
        size,
        price: price(retail || cost, settings),
        cost,
        images,
        image: images[0] || "",
        inStock: true
      };
    });

    const imageCandidates = variantOptions.flatMap((variant: any) => variant.images || []);

    // Miniatura oficial primeiro — é a foto pensada pela Printful para
    // representar o produto. As fotos dos variantes (que às vezes incluem
    // ângulos de detalhe) só entram a seguir, como imagens extra da galeria.
    const gallery = cleanGallery([p.thumbnail_url, ...imageCandidates]);

    const image =
      gallery[0] ||
      p.thumbnail_url ||
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop";

    const title = cleanText(p.name || detail?.sync_product?.name || "Printful product");

    const allVariantText = variants.map((variant: any) => variantText(variant)).join(" ").toLowerCase();

    const sizes = Array.from(
      new Set(variantOptions.map((variant: any) => variant.size).filter(Boolean))
    );

    const colorNames = Array.from(
      new Set(variantOptions.map((variant: any) => variant.color).filter(Boolean))
    );

    const colors = colorNames.map((name: string) => ({
      name,
      hex: colorHex(name),
      stock: 999
    }));

    const retail = Number(firstVariant?.retail_price || 0);
    const cost = Number(firstVariant?.cost || 0);

    products.push({
      id: `printful-${p.id}`,
      slug: slugify(title),
      title,
      categoryId: "",
      category: "",
      categoryIds: [],
      collection: "",
      gender: allVariantText.includes("women") ? "women" : allVariantText.includes("men") ? "men" : "unisex",
      style: "",
      price: price(retail || cost, settings),
      compareAt: 0,
      cost,
      stock: variants.length || 999,
      source: "printful",
      status: "active",
      image,
      mediaType: "image",
      gallery,
      description: cleanText(detail?.sync_product?.description || ""),
      details: ["Produ\u00e7\u00e3o sob encomenda", "Envio pela Printful"],
      colors,
      sizes,
      variants: variantOptions,
      variantOptions,
      tags: ["printful"],
      provider: "printful",
      providerProductId: String(p.id),
      providerVariantId: firstVariant?.id ? String(firstVariant.id) : "",
      printfulSyncProductId: String(p.id),
      printfulSyncVariantId: firstVariant?.id ? String(firstVariant.id) : ""
    });
  }

  return products;
}

export async function testPrintfulConnection(config: any) {
  const stores = await queryPrintfulStores(config);
  return { ok: true, count: stores.length, stores };
}





