import { isAdmin } from "@/lib/auth";
export const dynamic="force-dynamic";export const revalidate=0;
export async function GET(){if(!(await isAdmin())) return Response.json({error:"Unauthorized"},{status:401}); return Response.json({ok:true});}

