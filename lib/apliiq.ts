import crypto from "crypto";
import { Product } from "@/types";
import { slugify } from "@/lib/db";

const BASE_URL = "https://api.apliiq.com";

export function getApliiqConfig(settings: any) {
  const c = settings?.integrations?.apliiq || {};
  return {
    enabled: Boolean(c.enabled),
    apiKey: c.apiKey || "",
    sharedSecret: c.sharedSecret || "",
    useAsProductSource: c.useAsProductSource !== false,
    autoSubmitOrders: c.autoSubmitOrders !== false
  };
}

// Assinatura HMAC exigida pela Apliiq em todos os pedidos:
// header "x-apliiq-auth" = RTS:SIG:APPID:STATE, com
// SIG = Base64(HMACSHA256(APPID + RTS + STATE + Base64(body), sharedSecret)).
function buildAuthHeader(config: any, bodyString: string) {
  if (!config.apiKey || !config.sharedSecret) {
    throw new Error("Apliiq API Key ou Shared Secret em falta.");
  }

  const rts = Math.floor(Date.now() / 1000);
  const state = crypto.randomBytes(16).toString("hex");
  const bodyBase64 = bodyString ? Buffer.from(bodyString).toString("base64") : "";
  const message = `${config.apiKey}${rts}${state}${bodyBase64}`;
  const sig = crypto.createHmac("sha256", config.sharedSecret).update(message).digest("base64");

  return `${rts}:${sig}:${config.apiKey}:${state}`;
}

async function aq(config: any, path: string, init?: RequestInit) {
  const bodyString = typeof init?.body === "string" ? init.body : "";
  const auth = buildAuthHeader(config, bodyString);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-apliiq-auth": auth,
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Erro Apliiq: ${res.status}`);
  }

  return data;
}

function price(base: number, settings: any) {
  const value = Number(base || 0);
  if (settings?.pricing?.mode === "margin") {
    return Number((value * (1 + Number(settings?.pricing?.marginPercent || 40) / 100)).toFixed(2));
  }
  return value;
}

export async function queryApliiqRawProducts(config: any) {
  const data = await aq(config, "/api/Product");
  return Array.isArray(data) ? data : data?.products || data?.data || [];
}

export async function queryApliiqProducts(config: any, settings: any): Promise<Product[]> {
  const list = await queryApliiqRawProducts(config);

  return list.map((p: any) => {
    const code = String(p.Code || p.code || p.SKU || p.sku || "");
    const title = p.Name || p.name || code || "Apliiq product";
    const sizes: any[] = p.Sizes || p.sizes || [];
    const colors: any[] = p.Colors || p.colors || [];
    const variants: any[] = p.Variants || p.variants || [];
    const firstVariant = variants[0] || {};

    return {
      id: `apliiq-${code}`,
      slug: slugify(title),
      title,
      categoryId: "",
      category: "",
      collection: "",
      gender: "unisex",
      style: "apliiq",
      price: price(firstVariant.Price || firstVariant.price || 0, settings),
      compareAt: 0,
      cost: Number(firstVariant.Cost || firstVariant.cost || 0),
      stock: 999,
      source: "apliiq",
      status: "active",
      image:
        p.Image || p.image ||
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop",
      mediaType: "image",
      gallery: p.Images || p.images || [],
      description: p.Description || p.description || "Produto print-on-demand produzido e enviado pela Apliiq.",
      details: ["Produção sob encomenda", "Envio pela Apliiq"],
      colors: colors.map((c: any) => ({
        name: typeof c === "string" ? c : c.Name || c.name || "",
        hex: typeof c === "string" ? "" : c.Hex || c.hex || "",
        stock: 999
      })),
      sizes: sizes.map((s: any) => (typeof s === "string" ? s : s.Name || s.name || "")),
      tags: ["apliiq"],
      provider: "apliiq",
      providerProductId: code,
      providerVariantId: String(firstVariant.SKU || firstVariant.sku || ""),
      apliiqSku: String(firstVariant.SKU || firstVariant.sku || code)
    } as Product;
  });
}

export async function testApliiqConnection(config: any) {
  const list = await queryApliiqRawProducts(config);
  return { ok: true, count: list.length };
}
