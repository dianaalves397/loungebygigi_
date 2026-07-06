// @ts-nocheck
// Webhook da Printful: quando um produto muda na Printful, invalida a cache
// pública — a loja atualiza-se na visita seguinte sem sincronizações manuais.
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RELEVANT = new Set([
  "product_updated",
  "product_synced",
  "product_deleted",
  "product.created",
  "product.updated",
  "stock_updated"
]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (RELEVANT.has(String(body?.type || ""))) {
    revalidateTag("store");
  }
  return Response.json({ received: true });
}
