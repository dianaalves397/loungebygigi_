import { createClient } from "@supabase/supabase-js";
import { getOrders } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase nao configurado.");
  }

  return createClient(url, serviceKey);
}

function cleanOrder(order: any) {
  return {
    id: order.id,
    status: order.status || "pending",
    customerEmail: order.customerEmail || order.email || "",
    total: Number(order.total || 0),
    currency: order.currency || "EUR",
    paymentProvider: order.paymentProvider || order.provider || "",
    paymentStatus: order.paymentStatus || order.status || "",
    createdAt: order.createdAt || order.created_at || "",
    receiptSent: Boolean(order.receiptSent),
    items: Array.isArray(order.items)
      ? order.items.map((item: any) => ({
          title: item.title || item.name || "Produto",
          quantity: Number(item.quantity || 1),
          size: item.size || "",
          color: item.color || "",
          price: Number(item.price || 0),
          variant: item.variant || ""
        }))
      : []
  };
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return Response.json({ error: "Sessao em falta." }, { status: 401 });
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user?.email) {
      return Response.json({ error: "Sessao invalida." }, { status: 401 });
    }

    const email = data.user.email.toLowerCase();
    const orders = await getOrders();

    const customerOrders = orders
      .filter((order: any) => {
        const orderEmail = String(order.customerEmail || order.email || "").toLowerCase();
        return orderEmail === email;
      })
      .map(cleanOrder)
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return Response.json({
      ok: true,
      email,
      orders: customerOrders
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Erro ao carregar encomendas." },
      { status: 500 }
    );
  }
}
