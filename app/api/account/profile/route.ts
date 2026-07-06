import { createClient } from "@supabase/supabase-js";
import { getCustomers, saveCustomers } from "@/lib/db";

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

async function getUserFromRequest(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) throw new Error("Sessao em falta.");

  const supabase = getServerSupabase();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.email) throw new Error("Sessao invalida.");

  return data.user;
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    const customers = await getCustomers();

    const profile =
      customers.find((customer: any) => String(customer.email).toLowerCase() === String(user.email).toLowerCase()) || {
        email: user.email,
        name: user.user_metadata?.name || "",
        phone: "",
        addresses: [],
        createdAt: new Date().toISOString()
      };

    return Response.json({ ok: true, profile });
  } catch (error: any) {
    return Response.json({ error: error.message || "Erro ao carregar perfil." }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();

    const customers = await getCustomers();
    const email = String(user.email || "").toLowerCase();

    const nextProfile = {
      email,
      name: body.name || "",
      phone: body.phone || "",
      addresses: Array.isArray(body.addresses) ? body.addresses : [],
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const index = customers.findIndex((customer: any) => String(customer.email).toLowerCase() === email);

    if (index >= 0) {
      customers[index] = {
        ...customers[index],
        ...nextProfile
      };
    } else {
      customers.unshift(nextProfile as any);
    }

    await saveCustomers(customers as any);

    return Response.json({ ok: true, profile: nextProfile });
  } catch (error: any) {
    return Response.json({ error: error.message || "Erro ao guardar perfil." }, { status: 401 });
  }
}
