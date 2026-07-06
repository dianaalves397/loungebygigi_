// @ts-nocheck
// Submissão de encomendas à Printful (fulfilment/envios).
// Antes desta correção o site nunca enviava nada à Printful — as encomendas
// ficavam apenas registadas localmente e nenhum envio era produzido.

import { getPrintfulConfig } from "@/lib/printful";

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

export function recipientFromStripeSession(session: any): Recipient | null {
  const details =
    session?.collected_information?.shipping_details ||
    session?.shipping_details ||
    session?.customer_details;

  const address = details?.address;
  if (!address?.line1 || !address?.country) return null;

  return {
    name: details?.name || session?.customer_details?.name || "Cliente",
    email: session?.customer_details?.email || "",
    phone: session?.customer_details?.phone || "",
    address1: address.line1,
    address2: address.line2 || "",
    city: address.city || "",
    state_code: address.state || "",
    country_code: address.country,
    zip: address.postal_code || ""
  };
}

export async function submitOrderToPrintful(settings: any, order: any, recipient: Recipient) {
  const config = getPrintfulConfig(settings);

  if (!config.enabled || !config.apiToken) {
    return { submitted: false, reason: "Printful desativada." };
  }
  if (!config.autoSubmitOrders) {
    return { submitted: false, reason: "Envio automático desligado no painel." };
  }

  const items = (order.items || [])
    .filter((item: any) => item.printfulSyncVariantId || item.providerVariantId)
    .map((item: any) => ({
      sync_variant_id: Number(item.printfulSyncVariantId || item.providerVariantId),
      quantity: Number(item.quantity || 1)
    }))
    .filter((item: any) => Number.isFinite(item.sync_variant_id) && item.sync_variant_id > 0);

  if (!items.length) {
    return { submitted: false, reason: "Nenhum artigo Printful na encomenda." };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiToken}`,
    "Content-Type": "application/json"
  };
  if (config.storeId) headers["X-PF-Store-Id"] = String(config.storeId);

  // confirm=1 → a Printful produz e envia automaticamente após o pagamento.
  const res = await fetch("https://api.printful.com/orders?confirm=1", {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      external_id: String(order.id),
      recipient,
      items
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error?.message || data?.result || `Erro Printful (${res.status})`);
  }

  return {
    submitted: true,
    printfulOrderId: data?.result?.id,
    status: data?.result?.status
  };
}
