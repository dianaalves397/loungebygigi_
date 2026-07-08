// @ts-nocheck
// Submissão de encomendas à Apliiq (produção/envio) — equivalente ao lib/printfulOrders.ts.

import crypto from "crypto";
import { getApliiqConfig } from "@/lib/apliiq";

const BASE_URL = "https://api.apliiq.com";

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

function buildAuthHeader(config: any, bodyString: string) {
  const rts = Math.floor(Date.now() / 1000);
  const state = crypto.randomBytes(16).toString("hex");
  const bodyBase64 = bodyString ? Buffer.from(bodyString).toString("base64") : "";
  const message = `${config.apiKey}${rts}${state}${bodyBase64}`;
  const sig = crypto.createHmac("sha256", config.sharedSecret).update(message).digest("base64");

  return `${rts}:${sig}:${config.apiKey}:${state}`;
}

function addressPayload(recipient: Recipient) {
  const nameParts = String(recipient.name || "Cliente").trim().split(/\s+/);
  const firstName = nameParts[0] || "Cliente";
  const lastName = nameParts.slice(1).join(" ") || firstName;

  return {
    first_name: firstName,
    last_name: lastName,
    address1: recipient.address1,
    address2: recipient.address2 || "",
    city: recipient.city,
    zip: recipient.zip,
    country: recipient.country_code,
    country_code: recipient.country_code,
    province: recipient.state_code || "",
    province_code: recipient.state_code || "",
    phone: recipient.phone || ""
  };
}

export async function submitOrderToApliiq(settings: any, order: any, recipient: Recipient) {
  const config = getApliiqConfig(settings);

  if (!config.enabled || !config.apiKey || !config.sharedSecret) {
    return { submitted: false, reason: "Apliiq desativada." };
  }
  if (!config.autoSubmitOrders) {
    return { submitted: false, reason: "Envio automático desligado no painel." };
  }

  const items = (order.items || [])
    .filter((item: any) => item.apliiqSku)
    .map((item: any) => ({
      sku: String(item.apliiqSku),
      name: item.title || "",
      quantity: Number(item.quantity || 1)
    }));

  if (!items.length) {
    return { submitted: false, reason: "Nenhum artigo Apliiq na encomenda." };
  }

  const address = addressPayload(recipient);

  const body = JSON.stringify({
    id: String(order.id),
    number: String(order.id),
    name: String(order.id),
    order_number: String(order.id),
    billing_address: address,
    shipping_address: address,
    shipping_lines: [],
    line_items: items
  });

  const res = await fetch(`${BASE_URL}/v1/Order`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-apliiq-auth": buildAuthHeader(config, body)
    },
    cache: "no-store",
    body
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Erro Apliiq (${res.status})`);
  }

  return {
    submitted: true,
    apliiqOrderId: data?.id
  };
}
