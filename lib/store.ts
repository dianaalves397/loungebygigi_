const memoryCache = new Map<
  string,
  {
    value: any;
    updated: number;
  }
>();

const CACHE_TIME = 1000 * 60 * 5; // 5 minutos



import { revalidateTag } from "next/cache";
import fs from "fs/promises";
import path from "path";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabaseAdmin";


const dataDir = path.join(process.cwd(), "data");

type StoreKey =
  | "settings"
  | "products"
  | "categories"
  | "orders"
  | "customers";

const files: Record<StoreKey, string> = {
  settings: "settings.json",
  products: "products.json",
  categories: "categories.json",
  orders: "orders.json",
  customers: "customers.json"
};

async function readLocalJson<T>(key: StoreKey, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(dataDir, files[key]), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
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

const cached = memoryCache.get(key);

if (cached && Date.now() - cached.updated < CACHE_TIME) {
  return cached.value;
}

  if (!hasSupabaseConfig()) {

    const local = await readLocalJson(key, fallback);

    memoryCache.set(key,{
        value:local,
        updated:Date.now()
    });

    return local;
}

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
    const local = await readLocalJson(key, fallback);
    await writeStore(key, local);
    return local;
  }

  memoryCache.set(key, {
  value: data.data,
  updated: Date.now()
});

return data.data as T;
}

export async function writeStore<T>(key: StoreKey, value: T) {

  memoryCache.set(key,{
    value,
    updated:Date.now()
});

  if (!hasSupabaseConfig()) {
    await writeLocalJson(key, value);
    invalidatePublicCache();
    return;
  }

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

// Invalida a cache pública sempre que algo é gravado (painel, checkout, sync).
// Guardado em try/catch porque revalidateTag só é permitido em route handlers.
function invalidatePublicCache() {
  try {
    revalidateTag("store");
  } catch {
    // fora de um route handler (ex.: seed durante render) — ignorar
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

