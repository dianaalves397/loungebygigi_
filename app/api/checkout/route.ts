// @ts-nocheck
import Stripe from "stripe";
import { getOrders, saveOrders, getProducts } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Países para onde a Printful envia a partir da Europa (ajustável).
const SHIPPING_COUNTRIES = [
  "PT", "ES", "FR", "DE", "IT", "NL", "BE", "LU", "IE", "AT", "DK", "SE",
  "FI", "PL", "CZ", "GR", "HR", "RO", "BG", "HU", "SK", "SI", "EE", "LV",
  "LT", "MT", "CY", "GB", "CH", "NO", "US", "CA", "BR", "AU"
];

// Segurança: o preço NUNCA vem do browser. É sempre lido do catálogo real
// no servidor (antes desta correção era possível pagar qualquer valor).
async function priceItemsFromCatalog(items: any[]) {
  const products = await getProducts();
  const byId = new Map(products.map((product: any) => [String(product.id), product]));

  return items.map((item: any) => {
    const product: any = byId.get(String(item.productId));
    if (!product) throw new Error(`Produto não encontrado: ${item.title || item.productId}`);
    if (product.status && product.status !== "active") {
      throw new Error(`Produto indisponível: ${product.title}`);
    }

    let price = Number(product.price || 0);
    let variant: any = null;

    const variants = product.variants || product.variantOptions || [];
    const wantedVariant = String(
      item.printfulSyncVariantId || item.providerVariantId || ""
    );

    if (wantedVariant) {
      variant = variants.find((v: any) => String(v.id) === wantedVariant);
    }
    if (!variant && (item.color || item.size)) {
      variant = variants.find(
        (v: any) =>
          (!item.color || String(v.color).toLowerCase() === String(item.color).toLowerCase()) &&
          (!item.size || String(v.size).toLowerCase() === String(item.size).toLowerCase())
      );
    }
    if (variant && Number(variant.price) > 0) price = Number(variant.price);

    return {
      productId: product.id,
      title: product.title,
      image: product.image || "",
      quantity: Math.max(1, Math.min(20, Number(item.quantity || 1))),
      price,
      color: item.color || variant?.color || "",
      size: item.size || variant?.size || "",
      provider: product.provider || product.source,
      providerProductId: product.providerProductId || "",
      providerVariantId: String(variant?.providerVariantId || variant?.id || product.providerVariantId || ""),
      printfulSyncProductId: product.printfulSyncProductId || "",
      printfulSyncVariantId: String(variant?.syncVariantId || variant?.id || product.printfulSyncVariantId || ""),
      printifyProductId: product.printifyProductId || "",
      printifyVariantId: item.printifyVariantId || product.printifyVariantId || "",
      apliiqSku: variant?.apliiqSku || product.apliiqSku || ""
    };
  });
}

async function createLocalOrder({ items, customerEmail, status, paymentProvider }: any) {
  const total = items.reduce(
    (sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const orders = await getOrders();
  const order: any = {
    id: `${paymentProvider}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    customerEmail: customerEmail || "",
    status,
    paymentProvider,
    total,
    items: items.map((item: any) => ({
      productId: item.productId,
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      variant: [item.color, item.size].filter(Boolean).join(" / "),
      provider: item.provider,
      providerProductId: item.providerProductId,
      providerVariantId: item.providerVariantId,
      printfulSyncProductId: item.printfulSyncProductId,
      printfulSyncVariantId: item.printfulSyncVariantId,
      printifyProductId: item.printifyProductId,
      printifyVariantId: item.printifyVariantId,
      apliiqSku: item.apliiqSku
    })),
    receiptSent: false
  };
  orders.unshift(order);
  await saveOrders(orders as any);
  return order;
}

async function paypalUrl(settings: any, order: any) {
  const mode = settings.payments?.paypalMode || "sandbox";
  const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const id = settings.payments?.paypalClientId;
  const secret = settings.payments?.paypalClientSecret;
  if (!id || !secret) throw new Error("PayPal Client ID ou Client Secret em falta.");

  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(tokenData.error_description || tokenData.error || "Erro PayPal token.");

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: order.id,
          amount: {
            currency_code: settings.brand?.currency || "EUR",
            value: Number(order.total || 0).toFixed(2)
          }
        }
      ],
      application_context: {
        return_url: `${site}/success?provider=paypal&order=${order.id}`,
        cancel_url: `${site}/shop`
      }
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao criar encomenda PayPal.");
  return data.links?.find((link: any) => link.rel === "approve")?.href;
}

export async function POST(req: Request) {
  try {
    const { items, customerEmail, provider } = await req.json();
    const settings = await getSettings();
    if (!items?.length) return Response.json({ error: "Carrinho vazio." }, { status: 400 });

    // Preços reais vindos do catálogo (servidor), nunca do browser.
    const pricedItems = await priceItemsFromCatalog(items);

    const selected = provider || settings.payments?.checkoutProvider || "stripe";

    if (selected === "paypal" && settings.payments?.paypalEnabled) {
      const order = await createLocalOrder({
        items: pricedItems,
        customerEmail,
        status: "pending",
        paymentProvider: "paypal"
      });
      return Response.json({ url: await paypalUrl(settings, order), orderId: order.id });
    }

    if (settings.payments?.stripeEnabled && settings.payments?.stripeSecretKey) {
      const order = await createLocalOrder({
        items: pricedItems,
        customerEmail,
        status: "pending",
        paymentProvider: "stripe"
      });

      const stripe = new Stripe(settings.payments.stripeSecretKey);
      const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: customerEmail || undefined,
        success_url: `${site}/success?provider=stripe&order=${order.id}`,
        cancel_url: `${site}/shop`,
        metadata: { loungeOrderId: order.id },
        // Morada de envio: obrigatória para a Printful produzir e enviar.
        shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
        phone_number_collection: { enabled: true },
        line_items: pricedItems.map((item: any) => ({
          quantity: item.quantity,
          price_data: {
            currency: (settings.brand?.currency || "eur").toLowerCase(),
            product_data: {
              name: [item.title, [item.color, item.size].filter(Boolean).join(" / ")]
                .filter(Boolean)
                .join(" — "),
              images: item.image ? [item.image] : []
            },
            unit_amount: Math.round(Number(item.price || 0) * 100)
          }
        }))
      });

      return Response.json({ url: session.url, orderId: order.id });
    }

    const order = await createLocalOrder({
      items: pricedItems,
      customerEmail,
      status: "pending",
      paymentProvider: "manual"
    });
    return Response.json({
      orderId: order.id,
      message: settings.payments?.manualPaymentInstructions || "Encomenda registada."
    });
  } catch (error: any) {
    return Response.json({ error: error.message || "Erro ao processar checkout." }, { status: 500 });
  }
}
