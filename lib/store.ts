// Memória local apenas para modo sem Supabase (dev local, ficheiros).
// Em modo Supabase, cada Lambda tem a sua própria memória — não há cache
// partilhado entre instâncias, logo sempre lemos directamente do Supabase.
const localCache = new Map<string, { value: any; updated: number }>();
const LOCAL_CACHE_TTL = 1000 * 60 * 5; // 5 minutos (só local)

import { revalidateTag, revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabaseAdmin";

// Importações estáticas: garantem que os dados iniciais são sempre incluídos
// no bundle Lambda do Vercel (o file tracing dinâmico falha com process.cwd()).
import _defaultProducts from "@/data/products.json";
import _defaultCategories from "@/data/categories.json";
import _defaultSettings from "@/data/settings.json";
import _defaultOrders from "@/data/orders.json";
import _defaultCustomers from "@/data/customers.json";
import _defaultNewsletter from "@/data/newsletter.json";

const bundledDefaults: Record<string, unknown> = {
  products: _defaultProducts,
  categories: _defaultCategories,
  settings: _defaultSettings,
  orders: _defaultOrders,
  customers: _defaultCustomers,
  newsletter: _defaultNewsletter,
};

const dataDir = path.join(process.cwd(), "data");

type StoreKey =
  | "settings"
  | "products"
  | "categories"
  | "orders"
  | "customers"
  | "newsletter";

const files: Record<StoreKey, string> = {
  settings: "settings.json",
  products: "products.json",
  categories: "categories.json",
  orders: "orders.json",
  customers: "customers.json",
  newsletter: "newsletter.json"
};

async function readLocalJson<T>(key: StoreKey, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(dataDir, files[key]), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    // Se o ficheiro não for acessível em runtime (ex: Vercel Lambda),
    // usa o import estático do build — inclui sempre os dados reais.
    return (bundledDefaults[key] as T) ?? fallback;
  }
}

async function writeLocalJson<T>(key: StoreKey, data: T) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, files[key]),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

export async function readStore<T>(key: StoreKey, fallback: T): Promise<T> {
  if (!hasSupabaseConfig()) {
    // Modo local: usa cache em memória para evitar leituras repetidas de disco
    const cached = localCache.get(key);
    if (cached && Date.now() - cached.updated < LOCAL_CACHE_TTL) {
      return cached.value;
    }
    const local = await readLocalJson(key, fallback);
    localCache.set(key, { value: local, updated: Date.now() });
    return local;
  }

  // Modo Supabase: lê sempre directamente — cada Lambda tem memória isolada,
  // por isso a cache em memória seria sempre stale após escrita noutra instância.
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lounge_store")
    .select("data")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao ler Supabase (${key}): ${error.message}`);
  }

  if (!data) {
    // Sem registo no Supabase: devolve o default estático sem escrever.
    // O Supabase só é populado quando o utilizador guardar algo ou clicar
    // explicitamente em "Inicializar Supabase" no painel.
    return (bundledDefaults[key] as T) ?? fallback;
  }

  return data.data as T;
}

export async function writeStore<T>(key: StoreKey, value: T) {
  if (!hasSupabaseConfig()) {
    if (process.env.VERCEL) {
      // Na Vercel sem Supabase, o filesystem é efémero — dados perder-se-iam.
      throw new Error(
        "Base de dados não configurada. Adiciona NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da Vercel."
      );
    }
    // Local: actualiza cache em memória + ficheiro em disco
    localCache.set(key, { value, updated: Date.now() });
    await writeLocalJson(key, value);
    invalidatePublicCache();
    return;
  }

  // Modo Supabase: escreve directamente, sem cache em memória (cross-Lambda)
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("lounge_store").upsert({
    key,
    data: value as any,
    updated_at: new Date().toISOString()
  });

  if (!error) invalidatePublicCache();

  if (error) {
    throw new Error(`Erro ao guardar Supabase (${key}): ${error.message}`);
  }
}

function invalidatePublicCache() {
  try {
    revalidateTag("store");
    revalidatePath("/", "layout");
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[store] invalidatePublicCache ignorado:", err);
    }
  }
}

export async function seedSupabaseFromLocal() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase não está configurado.");
  }

  const keys: StoreKey[] = [
    "settings",
    "products",
    "categories",
    "orders",
    "customers"
  ];

  for (const key of keys) {
    const local = await readLocalJson(key, key === "settings" ? {} : []);
    await writeStore(key, local);
  }

  return { ok: true };
}
