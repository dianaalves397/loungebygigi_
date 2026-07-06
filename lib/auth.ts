import { cookies } from "next/headers";

const COOKIE_NAME = "lounge_admin";

export async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === "authenticated";
}

export async function requireAdmin() {
  const ok = await isAdmin();
  if (!ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export { COOKIE_NAME };

