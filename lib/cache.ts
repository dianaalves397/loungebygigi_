// @ts-nocheck
// Camada de cache central.
// Objetivo: páginas públicas quase nunca tocam na Supabase nem na Printful.
// Tudo fica em cache no edge/data-cache da Vercel e é invalidado por tag
// sempre que o painel de administração grava alguma coisa (ver lib/store.ts).

import { unstable_cache } from "next/cache";
import { getProducts, getCategories } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const STORE_TAG = "store";

// 6 horas de vida máxima; na prática é invalidada logo que algo muda no painel.
const REVALIDATE_SECONDS = 60 * 60 * 6;

export const getCachedProducts = unstable_cache(
  async () => {
    const products = await getProducts();
    return Array.isArray(products) ? products : [];
  },
  ["public-products"],
  { revalidate: REVALIDATE_SECONDS, tags: [STORE_TAG] }
);

export const getCachedCategories = unstable_cache(
  async () => {
    const categories = await getCategories();
    return Array.isArray(categories) ? categories : [];
  },
  ["public-categories"],
  { revalidate: REVALIDATE_SECONDS, tags: [STORE_TAG] }
);

// Só campos públicos das definições — nunca expor chaves/segredos em páginas.
export const getCachedPublicSettings = unstable_cache(
  async () => {
    const settings = await getSettings();
    return {
      brand: settings?.brand || {},
      home: settings?.home || {},
      landing: settings?.landing || {},
      about: settings?.about || {},
      layout: settings?.layout || {},
      navigation: settings?.navigation || []
    };
  },
  ["public-settings"],
  { revalidate: REVALIDATE_SECONDS, tags: [STORE_TAG] }
);
