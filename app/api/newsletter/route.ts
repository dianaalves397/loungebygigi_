import { readStore, writeStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const clean = String(email || "").trim().toLowerCase();

    if (!EMAIL_RE.test(clean)) {
      return Response.json({ error: "Email inválido." }, { status: 400 });
    }

    const subscribers = await readStore<any[]>("newsletter", []);

    if (!subscribers.some((entry: any) => entry.email === clean)) {
      subscribers.push({ email: clean, createdAt: new Date().toISOString() });
      await writeStore("newsletter", subscribers);
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Erro ao subscrever." }, { status: 500 });
  }
}
