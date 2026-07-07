import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";
export const dynamic="force-dynamic"; export const revalidate=0;
export async function POST(req:Request){const u=await requireAdmin(); if(u) return u; try { const {productId,override}=await req.json(); const settings=await getSettings(); settings.productOverrides=settings.productOverrides||{}; settings.productOverrides[productId]={...(settings.productOverrides[productId]||{}),...override}; await saveSettings(settings); return Response.json({ok:true,override:settings.productOverrides[productId]}); } catch(error:any) { return Response.json({error:error?.message||"Erro ao guardar override."},{status:500}); } }

