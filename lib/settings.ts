import { readStore, writeStore } from "@/lib/store";

// Secções depois do moodboard (ver components/moodboard/HomeSections.tsx) —
// mostradas por omissão enquanto a loja não guardar as suas próprias pela
// aba "Secções da coleção" do painel (a primeira gravação lá marca
// homeSectionsInitialized:true e estes deixam de aparecer). As fotos já
// existem em public/home-sections/ (cópias das imagens de categoria já
// usadas no moodboard), por isso já aparece algo assim que se acede ao
// site, mesmo antes de a loja escolher as suas próprias imagens/textos.
const DEFAULT_HOME_SECTIONS = [
  {
    id: "sports",
    name: "Sports",
    subtitle: "Peças pensadas para o movimento.",
    ctaLabel: "Comprar agora",
    fontStyle: "sans-bold",
    width: "full",
    mediaType: "image",
    targetType: "category",
    categoryId: "sports",
    productIds: []
  },
  {
    id: "verao",
    name: "Verão",
    subtitle: "A nova coleção de verão.",
    ctaLabel: "Comprar agora",
    fontStyle: "sans-bold",
    width: "full",
    mediaType: "image",
    targetType: "category",
    categoryId: "summer",
    productIds: []
  },
  {
    id: "loungewear",
    name: "Loungewear",
    fontStyle: "sans-bold",
    width: "half",
    mediaType: "image",
    targetType: "category",
    categoryId: "loungewear",
    productIds: []
  },
  {
    id: "acessorios",
    name: "Acessórios",
    fontStyle: "sans-bold",
    width: "half",
    mediaType: "image",
    targetType: "category",
    categoryId: "acessorios",
    productIds: []
  }
];

export async function getSettings(): Promise<any> {
  const settings = await readStore<any>("settings", {});

  if (!settings.homeSectionsInitialized) {
    settings.homeSections = DEFAULT_HOME_SECTIONS;
  }

  return settings;
}

export async function saveSettings(settings: any) {
  await writeStore("settings", settings);
}

export function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== "object") return target;

  const output = { ...target };

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      output[key] = deepMerge(target?.[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }

  return output;
}

