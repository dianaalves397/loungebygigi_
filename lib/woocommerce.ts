export type WooCheckoutItem = {
  productId: string;
  quantity: number;
};

function getWooProductId(productId: string) {
  if (!productId.startsWith("woocommerce-")) return null;
  const raw = productId.replace("woocommerce-", "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createWooCommercePaymentUrl({
  config,
  items,
  customerEmail
}: {
  config: any;
  items: WooCheckoutItem[];
  customerEmail?: string;
}) {
  if (!config?.storeUrl || !config?.consumerKey || !config?.consumerSecret) {
    throw new Error("WooCommerce não está configurado.");
  }

  const lineItems = items.map((item) => {
    const productId = getWooProductId(item.productId);

    if (!productId) {
      throw new Error(
        "O checkout WooCommerce só funciona com produtos sincronizados do WooCommerce."
      );
    }

    return {
      product_id: productId,
      quantity: Number(item.quantity || 1)
    };
  });

  const endpoint = new URL("/wp-json/wc/v3/orders", config.storeUrl);

  const basicAuth = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");

  const res = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`
    },
    body: JSON.stringify({
      payment_method: "",
      payment_method_title: "",
      set_paid: false,
      status: "pending",
      billing: {
        email: customerEmail || ""
      },
      line_items: lineItems
    }),
    cache: "no-store"
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || `Erro WooCommerce: ${res.status}`);
  }

  if (data.payment_url) {
    return data.payment_url;
  }

  if (data.id && data.order_key) {
    const cleanStoreUrl = String(config.storeUrl).replace(/\/$/, "");
    return `${cleanStoreUrl}/checkout/order-pay/${data.id}/?pay_for_order=true&key=${data.order_key}`;
  }

  const cleanStoreUrl = String(config.storeUrl).replace(/\/$/, "");
  return `${cleanStoreUrl}/checkout/`;
}

