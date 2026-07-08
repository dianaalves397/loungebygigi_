// @ts-nocheck
// Webhook do Stripe — confirma pagamentos e dispara o envio na Printful/Printify.
// Configurar no Stripe Dashboard: endpoint https://loungebygigi.online/api/webhooks/stripe
// com o evento "checkout.session.completed", e guardar o "signing secret"
// no painel (Pagamentos → Stripe Webhook Secret) ou em STRIPE_WEBHOOK_SECRET.

import Stripe from "stripe";
import { getOrders, saveOrders, getCustomers, saveCustomers } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { recipientFromStripeSession, submitOrderToPrintful } from "@/lib/printfulOrders";
import { submitOrderToPrintify } from "@/lib/printifyOrders";
import { submitOrderToApliiq } from "@/lib/apliiqOrders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const settings = await getSettings();

  const secretKey = settings?.payments?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  const webhookSecret =
    settings?.payments?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    return Response.json({ error: "Stripe não configurado." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const payload = await req.text();

  let event: Stripe.Event;

  if (webhookSecret) {
    const signature = req.headers.get("stripe-signature") || "";
    try {
      event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
    } catch (error: any) {
      return Response.json({ error: `Assinatura inválida: ${error.message}` }, { status: 400 });
    }
  } else {
    // Sem webhook secret configurado ainda: aceitar mas re-verificar na API
    // (nunca confiar no corpo sem confirmação junto do Stripe).
    try {
      const parsed = JSON.parse(payload);
      const sessionId = parsed?.data?.object?.id;
      if (!sessionId) return Response.json({ received: true });
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      event = { type: parsed.type, data: { object: session } } as any;
    } catch {
      return Response.json({ error: "Payload inválido." }, { status: 400 });
    }
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  const session: any = event.data.object;
  if (session.payment_status && session.payment_status !== "paid") {
    return Response.json({ received: true });
  }

  const orderId = session?.metadata?.loungeOrderId;
  if (!orderId) return Response.json({ received: true });

  const orders = await getOrders();
  const index = orders.findIndex((order: any) => String(order.id) === String(orderId));
  if (index < 0) return Response.json({ received: true });

  const order: any = orders[index];

  // Idempotência: o Stripe pode reenviar o mesmo evento.
  if (order.status === "paid" || order.status === "fulfilled") {
    return Response.json({ received: true });
  }

  order.status = "paid";
  order.paidAt = new Date().toISOString();
  order.customerEmail = order.customerEmail || session?.customer_details?.email || "";
  order.customerName = session?.customer_details?.name || order.customerName || "";

  const recipient = recipientFromStripeSession(session);
  if (recipient) order.shippingAddress = recipient;

  // Enviar à Printful e/ou à Printify (produção + envio automáticos).
  let anyFulfilled = false;

  try {
    if (recipient) {
      const result = await submitOrderToPrintful(settings, order, recipient);
      order.printful = result;
      if (result.submitted) anyFulfilled = true;
    } else {
      order.printful = { submitted: false, reason: "Morada de envio em falta." };
    }
  } catch (error: any) {
    // Não falhar o webhook: a encomenda fica "paid" e visível no painel
    // para submissão manual, com o erro registado.
    order.printful = { submitted: false, error: error.message };
  }

  try {
    if (recipient) {
      const result = await submitOrderToPrintify(settings, order, recipient);
      order.printify = result;
      if (result.submitted) anyFulfilled = true;
    } else {
      order.printify = { submitted: false, reason: "Morada de envio em falta." };
    }
  } catch (error: any) {
    order.printify = { submitted: false, error: error.message };
  }

  try {
    if (recipient) {
      const result = await submitOrderToApliiq(settings, order, recipient);
      order.apliiq = { ...order.apliiq, ...result };
      if (result.submitted) anyFulfilled = true;
    } else {
      order.apliiq = { ...order.apliiq, submitted: false, reason: "Morada de envio em falta." };
    }
  } catch (error: any) {
    order.apliiq = { ...order.apliiq, submitted: false, error: error.message };
  }

  if (anyFulfilled) order.status = "fulfilled";

  orders[index] = order;
  await saveOrders(orders);

  // Registar/atualizar cliente para a área de conta.
  try {
    const email = String(order.customerEmail || "").toLowerCase();
    if (email) {
      const customers = await getCustomers();
      const found = customers.findIndex(
        (customer: any) => String(customer.email || "").toLowerCase() === email
      );
      if (found >= 0) {
        customers[found].lastOrderAt = order.paidAt;
        customers[found].ordersCount = Number(customers[found].ordersCount || 0) + 1;
      } else {
        customers.push({
          id: `cus-${Date.now()}`,
          email,
          name: order.customerName || "",
          createdAt: order.paidAt,
          lastOrderAt: order.paidAt,
          ordersCount: 1
        });
      }
      await saveCustomers(customers);
    }
  } catch {
    // não crítico
  }

  return Response.json({ received: true });
}
