export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireAdmin } from "@/lib/auth";
import { hasSupabaseConfig, getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { readStore, writeStore } from "@/lib/store";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const result: Record<string, any> = {
    supabaseConfigured: hasSupabaseConfig(),
    vercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV,
  };

  if (!hasSupabaseConfig()) {
    result.error = "NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não estão definidas.";
    return Response.json(result);
  }

  // Testa leitura directa do Supabase
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("lounge_store")
      .select("key, updated_at")
      .limit(10);

    if (error) {
      result.supabaseReadable = false;
      result.supabaseError = error.message;
    } else {
      result.supabaseReadable = true;
      result.supabaseRows = data?.length ?? 0;
      result.supabaseKeys = data?.map((r: any) => r.key) ?? [];
    }
  } catch (err: any) {
    result.supabaseReadable = false;
    result.supabaseError = err.message;
  }

  // Testa leitura via readStore
  if (result.supabaseReadable) {
    try {
      const products = await readStore<any[]>("products", []);
      result.productsCount = Array.isArray(products) ? products.length : 0;
      result.storeReadable = true;
    } catch (err: any) {
      result.storeReadable = false;
      result.storeError = err.message;
    }
  }

  return Response.json(result);
}
