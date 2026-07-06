import { requireAdmin } from "@/lib/auth"; import { getSettings } from "@/lib/settings"; import { getPrintifyConfig, testPrintifyConnection } from "@/lib/printify";
export const dynamic="force-dynamic"; export const revalidate=0; export async function POST(){const u=await requireAdmin(); if(u) return u; try{const result=await testPrintifyConnection(getPrintifyConfig(await getSettings())); return Response.json({message:`Ligação Printify OK. Shops encontradas: ${result.count}`,...result});}catch(e:any){return Response.json({error:e.message||"Erro Printify"},{status:500});}}

