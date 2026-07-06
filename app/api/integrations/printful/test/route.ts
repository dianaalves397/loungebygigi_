import { requireAdmin } from "@/lib/auth"; import { getSettings } from "@/lib/settings"; import { getPrintfulConfig, testPrintfulConnection } from "@/lib/printful";
export const dynamic="force-dynamic"; export const revalidate=0; export async function POST(){const u=await requireAdmin(); if(u) return u; try{const result=await testPrintfulConnection(getPrintfulConfig(await getSettings())); return Response.json({message:`Ligação Printful OK. Stores encontradas: ${result.count}`,...result});}catch(e:any){return Response.json({error:e.message||"Erro Printful"},{status:500});}}

