// @ts-nocheck
// Submissão de encomendas à Printify (produção/envio) — equivalente ao lib/printfulOrders.ts.

import { getPrintifyConfig } from "@/lib/printify";

type Recipient = {
  name: string;
  email?: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
};

export async function submitOrderToPrintify(settings: any, order: any, recipient: Recipient) {
  const config = getPrintifyConfig(settings);

  if (!config.enabled || !config.apiToken) {
    return { submitted: false, reason: "Printify desativada." };
  }
  if (!config.autoSubmitOrders) {
    return { submitted: false, reason: "Envio automático desligado no painel." };
  }
  if (!config.shopId) {
    return { submitted: false, reason: "Printify Shop ID em falta." };
  }

  const items = (order.items || [])
    .filter((item: any) => item.printifyProductId && item.printifyVariantId)
    .map((item: any) => ({
      product_id: String(item.printifyProductId),
      variant_id: Number(item.printifyVariantId),
      quantity: Number(item.quantity || 1)
    }))
    .filter((item: any) => item.product_id && Number.isFinite(item.variant_id) && item.variant_id > 0);

  if (!items.length) {
    return { submitted: false, reason: "Nenhum artigo Printify na encomenda." };
  }

  const nameParts = String(recipient.name || "Cliente").trim().split(/\s+/);
  const firstName = nameParts[0] || "Cliente";
  const lastName = nameParts.slice(1).join(" ") || firstName;

  const res = await fetch(`https://api.printify.com/v1/shops/${config.shopId}/orders.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json"
    },
    cache: "no-store",
    body: JSON.stringify({
      external_id: String(order.id),
      line_items: items,
      shipping_method: 1,
      send_shipping_notification: false,
      address_to: {
        first_name: firstName,
        last_name: lastName,
        email: recipient.email || "",
        phone: recipient.phone || "",
        country: recipient.country_code,
        region: recipient.state_code || "",
        address1: recipient.address1,
        address2: recipient.address2 || "",
        city: recipient.city,
        zip: recipient.zip
      }
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Erro Printify (${res.status})`);
  }

  return {
    submitted: true,
    printifyOrderId: data?.id,
    status: data?.status
  };
}
