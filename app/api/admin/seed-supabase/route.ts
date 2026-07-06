import { requireAdmin } from "@/lib/auth";
import { seedSupabaseFromLocal } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const result = await seedSupabaseFromLocal();
    return Response.json({
      ...result,
      message: "Supabase inicializado com os dados locais."
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Erro ao inicializar Supabase." },
      { status: 500 }
    );
  }
}

