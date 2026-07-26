// Submissão de encomendas à PrintKK (produção/envio) — equivalente ao
// lib/apliiqOrders.ts / lib/printfulOrders.ts.
//
// Ver aviso em lib/printkk.ts: o endpoint e o formato exatos do corpo do
// pedido não estão confirmados contra a documentação real da PrintKK (site
// bloqueado a partir daqui) — isto é o melhor palpite a partir do fluxo
// documentado publicamente (design → encomenda → pagamento). Está protegido
// por try/catch no webhook do Stripe, por isso um erro aqui não impede o
// resto da encomenda de ser processada — só fica registado em order.printkk
// para correção manual.

import { getPrintkkConfig } from "@/lib/printkk";

const BASE_URL = "https://api.printkk.com";

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

export async function submitOrderToPrintkk(settings: any, order: any, recipient: Recipient) {
  const config = getPrintkkConfig(settings);

  if (!config.enabled || !config.apiKey) {
    return { submitted: false, reason: "PrintKK desativada." };
  }
  if (!config.autoSubmitOrders) {
    return { submitted: false, reason: "Envio automático desligado no painel." };
  }

  const items = (order.items || [])
    .filter((item: any) => item.printkkDesignId)
    .map((item: any) => ({
      design_id: String(item.printkkDesignId),
      product_id: item.printkkProductId ? String(item.printkkProductId) : undefined,
      quantity: Number(item.quantity || 1)
    }));

  if (!items.length) {
    return { submitted: false, reason: "Nenhum artigo PrintKK na encomenda." };
  }

  const body = JSON.stringify({
    reference: String(order.id),
    recipient: {
      name: recipient.name,
      email: recipient.email || "",
      phone: recipient.phone || "",
      address_line_1: recipient.address1,
      address_line_2: recipient.address2 || "",
      city: recipient.city,
      state: recipient.state_code || "",
      country_code: recipient.country_code,
      postal_code: recipient.zip
    },
    items
  });

  const res = await fetch(`${BASE_URL}/api/v1/orders`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    cache: "no-store",
    body
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Erro PrintKK (${res.status})`);
  }

  return {
    submitted: true,
    printkkOrderId: data?.id || data?.order_id
  };
}
