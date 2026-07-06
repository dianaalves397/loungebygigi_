export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getCustomers, getOrders } from "@/lib/db";
export async function GET(req:Request){ const url=new URL(req.url); const email=url.searchParams.get("email")||""; const customers=await getCustomers(); const orders=await getOrders(); return Response.json({customer:customers.find(c=>c.email.toLowerCase()===email.toLowerCase())||{email},orders:orders.filter(o=>o.customerEmail?.toLowerCase()===email.toLowerCase())}); }

