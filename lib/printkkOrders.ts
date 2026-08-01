// Submissão de encomendas à PrintKK (produção/envio) — equivalente ao
// lib/apliiqOrders.ts / lib/printfulOrders.ts.
//
// O esquema de autenticação (header "api-key" + assinatura HMAC-SHA256 com
// parâmetros ordenados alfabeticamente — ver lib/printkk.ts) está confirmado
// pela documentação oficial. O que NÃO está confirmado por um exemplo real é
// o caminho exato e os nomes dos campos deste endpoint de criação de
// encomenda em particular — usa-se "/api/v1/order/create" com campos simples
// (não aninhados, para caber no esquema de assinatura que a PrintKK usa nos
// exemplos confirmados). Uma encomenda por artigo, porque o exemplo genérico
// da documentação mostra uma encomenda com um único design/produto, não uma
// lista. Está protegido por try/catch no webhook do Stripe, por isso um erro
// aqui não impede o resto da encomenda de ser processada — só fica
// registado em order.printkk para correção manual.

import { getPrintkkConfig, printkkRequest } from "@/lib/printkk";

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

  if (!config.enabled || !config.apiKey || !config.secretKey) {
    return { submitted: false, reason: "PrintKK desativada." };
  }
  if (!config.autoSubmitOrders) {
    return { submitted: false, reason: "Envio automático desligado no painel." };
  }

  const items = (order.items || []).filter((item: any) => item.printkkDesignId);

  if (!items.length) {
    return { submitted: false, reason: "Nenhum artigo PrintKK na encomenda." };
  }

  const submitted: any[] = [];

  for (const item of items) {
    const params: Record<string, any> = {
      order_id: `${order.id}-${item.productId || submitted.length}`,
      design_id: String(item.printkkDesignId),
      product_id: item.printkkProductId ? String(item.printkkProductId) : undefined,
      quantity: Number(item.quantity || 1),
      recipient_name: recipient.name,
      recipient_email: recipient.email || "",
      recipient_phone: recipient.phone || "",
      recipient_address1: recipient.address1,
      recipient_address2: recipient.address2 || "",
      recipient_city: recipient.city,
      recipient_state: recipient.state_code || "",
      recipient_country_code: recipient.country_code,
      recipient_postal_code: recipient.zip
    };

    const data = await printkkRequest(config, "POST", "/api/v1/order/create", params);
    submitted.push({ productId: item.productId, printkkOrderId: data?.id || data?.order_id });
  }

  return { submitted: true, orders: submitted };
}
