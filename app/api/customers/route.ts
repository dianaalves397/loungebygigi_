export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getCustomers } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
export async function GET(){ const unauthorized=await requireAdmin(); if(unauthorized) return unauthorized; return Response.json(await getCustomers()); }

