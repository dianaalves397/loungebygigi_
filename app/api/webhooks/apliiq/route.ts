// @ts-nocheck
// Webhook da Apliiq — recebe a notificação de envio/tracking depois da
// produção. Assinatura: header "x-apliiq-hmac" = Base64(HMACSHA256(Base64(body), sharedSecret)).
// Configurar na Apliiq (Custom Store → Fulfillment URL): https://loungebygigi.online/api/webhooks/apliiq

import crypto from "crypto";
import { getOrders, saveOrders } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getApliiqConfig } from "@/lib/apliiq";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function verifySignature(bodyText: string, header: string, sharedSecret: string) {
  const bodyBase64 = Buffer.from(bodyText).toString("base64");
  const expected = crypto.createHmac("sha256", sharedSecret).update(bodyBase64).digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(String(header || ""));

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(req: Request) {
  const settings = await getSettings();
  const config = getApliiqConfig(settings);

  if (!config.sharedSecret) {
    return Response.json({ error: "Apliiq não configurada." }, { status: 400 });
  }

  const bodyText = await req.text();
  const signature = req.headers.get("x-apliiq-hmac") || "";

  if (!verifySignature(bodyText, signature, config.sharedSecret)) {
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const payload = JSON.parse(bodyText || "{}");
  const fulfillment = payload?.fulfillment;
  const orderId = fulfillment?.order_id;
  if (!orderId) return Response.json({ received: true });

  const orders = await getOrders();
  const index = orders.findIndex((order: any) => String(order.id) === String(orderId));
  if (index < 0) return Response.json({ received: true });

  const order: any = orders[index];
  order.apliiq = {
    ...order.apliiq,
    tracking: {
      status: fulfillment.status,
      company: fulfillment.tracking_company,
      numbers: fulfillment.tracking_numbers || [],
      urls: fulfillment.tracking_urls || []
    }
  };

  if (fulfillment.status === "success") {
    order.status = "fulfilled";
  }

  orders[index] = order;
  await saveOrders(orders);

  return Response.json({ received: true });
}
