import { COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const { username, password } = await req.json();

  // Por omissão "Diana2020*" (utilizador e password), caso ADMIN_USER /
  // ADMIN_PASSWORD não estejam definidas no ambiente. Define-as na Vercel
  // (Settings → Environment Variables) para usares as tuas próprias.
  const expectedUser = process.env.ADMIN_USER || "Diana2020*";
  const expectedPassword = process.env.ADMIN_PASSWORD || "Diana2020*";

  if (username !== expectedUser || password !== expectedPassword) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "authenticated", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return Response.json({ ok: true });
}

