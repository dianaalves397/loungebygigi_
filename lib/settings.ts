import { readStore, writeStore } from "@/lib/store";

// Secções depois do moodboard (ver components/moodboard/HomeSections.tsx) —
// mostradas por omissão enquanto a loja não guardar as suas próprias pela
// aba "Secções da coleção" do painel (a primeira gravação lá marca
// homeSectionsInitialized:true e estes deixam de aparecer). As fotos já
// existem em public/home-sections/, por isso já aparece algo assim que se
// acede ao site, mesmo antes de a loja escolher as suas próprias
// imagens/textos.
//
// Ritmo inspirado num lookbook/apresentação de marca: fiadas de fotos
// (tipo "gallery") intercaladas com títulos lisos sem imagem (tipo
// "heading"), com o mínimo de texto por bloco.
const DEFAULT_HOME_SECTIONS = [
  {
    id: "galeria-1",
    name: "Lounge by Gigi",
    subtitle: "Coleção",
    type: "gallery",
    imageCount: 3,
    fontStyle: "serif-italic",
    width: "full",
    mediaType: "image",
    targetType: "category",
    categoryId: "",
    productIds: []
  },
  {
    id: "nova-colecao",
    name: "Nova Coleção",
    type: "heading",
    fontStyle: "serif-italic",
    width: "full",
    mediaType: "image",
    targetType: "category",
    categoryId: "",
    productIds: []
  },
  {
    id: "galeria-2",
    name: "Lounge by Gigi",
    subtitle: "Lookbook",
    type: "gallery",
    imageCount: 3,
    fontStyle: "serif-italic",
    width: "full",
    mediaType: "image",
    targetType: "category",
    categoryId: "",
    productIds: []
  },
  {
    id: "galeria-3",
    name: "Lounge by Gigi",
    subtitle: "Peças da coleção",
    type: "gallery",
    imageCount: 5,
    fontStyle: "serif-italic",
    width: "full",
    mediaType: "image",
    targetType: "category",
    categoryId: "",
    productIds: []
  },
  {
    id: "marca",
    name: "lounge by gigi",
    ctaLabel: "Ver tudo",
    type: "heading",
    fontStyle: "serif-italic",
    width: "full",
    mediaType: "image",
    targetType: "category",
    categoryId: "",
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

