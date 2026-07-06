import { getOrders } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return Response.json(await getOrders(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

