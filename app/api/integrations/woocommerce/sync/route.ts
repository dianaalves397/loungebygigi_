export const dynamic = "force-dynamic";
export const revalidate = 0;
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { fetchWooCommerceProducts } from "@/lib/integrations";
import { getProducts, saveProducts } from "@/lib/db";
export async function POST(){ const unauthorized=await requireAdmin(); if(unauthorized) return unauthorized; try{ const settings=await getSettings(); const imported=await fetchWooCommerceProducts(settings.integrations.woocommerce); const other=(await getProducts()).filter(p=>p.source!=="woocommerce"); await saveProducts([...imported,...other]); return Response.json({message:`${imported.length} produtos importados do WooCommerce.`}); } catch(e:any){ return Response.json({error:e.message},{status:500}); } }

