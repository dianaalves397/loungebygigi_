export const dynamic = "force-dynamic";
export const revalidate = 0;
import { requireAdmin } from "@/lib/auth";
import { deepMerge, getSettings, saveSettings } from "@/lib/settings";
export async function GET(){ const unauthorized=await requireAdmin(); if(unauthorized) return unauthorized; return Response.json(await getSettings(), { headers: { "Cache-Control": "no-store" } }); }
export async function PUT(req:Request){ const unauthorized=await requireAdmin(); if(unauthorized) return unauthorized; try { const current=await getSettings(); const incoming=await req.json(); const next=deepMerge(current,incoming); await saveSettings(next); return Response.json(next); } catch(error:any) { return Response.json({ error: error?.message || "Erro ao guardar definições." }, { status: 500 }); } }

