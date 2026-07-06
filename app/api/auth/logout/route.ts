import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("lounge_admin", "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return Response.json({ ok: true });
}

