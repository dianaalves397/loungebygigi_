// Categorização automática por nome do produto.
// Um código de 3 letras no título (ex: "Yoga Top (SSM)") define categoria,
// subcategoria e género. Ver CODE_TABLE abaixo para o significado de cada letra.
// Só é aplicado a produtos ainda sem categoria (categoryId vazio) — produtos
// escolhidos manualmente no painel, ou já corrigidos via override, nunca são
// tocados por esta função (lib/db.ts aplica os overrides depois desta etapa).

type Detected = {
  categoryId: string;
  category: string;
  gender: "women" | "men" | "unisex";
};

const CATEGORY_LETTER: Record<string, string> = {
  s: "sports",
  l: "lounge",
  v: "summer", // v de "Verão"
  a: "acessorios"
};

const GENDER_LETTER: Record<string, "women" | "men" | "unisex"> = {
  m: "women", // mulher
  h: "men", // homem
  u: "unisex"
};

// [categoria][parte] -> { categoryId, category, precisaGenero }
// "precisaGenero" = true quando existe uma subcategoria distinta por género
// (sports e lounge); quando false, a categoria é sempre a mesma e só o
// género do produto (product.gender) é que muda consoante a 3ª letra.
const PART_TABLE: Record<
  string,
  Record<string, { name: string; genderSplit: boolean }>
> = {
  sports: {
    s: { name: "Peças superiores", genderSplit: true },
    i: { name: "Peças inferiores", genderSplit: true },
    c: { name: "Conjuntos", genderSplit: true }
  },
  lounge: {
    s: { name: "Peças superiores", genderSplit: true },
    i: { name: "Peças inferiores", genderSplit: true },
    c: { name: "Conjuntos", genderSplit: true }
  },
  summer: {
    r: { name: "Roupa", genderSplit: false },
    b: { name: "Banho", genderSplit: false }
  },
  acessorios: {
    j: { name: "Jewellery", genderSplit: false },
    b: { name: "Bags", genderSplit: false },
    s: { name: "Sunglasses", genderSplit: false },
    h: { name: "Hats", genderSplit: false }
  }
};

// categoryId real de cada combinação (ids tal como existem em data/categories.json).
const CATEGORY_ID_TABLE: Record<string, string> = {
  "sports-s-women": "sports-superiores-women",
  "sports-s-men": "sports-superiores-men",
  "sports-i-women": "sports-inferiores-women",
  "sports-i-men": "sports-inferiores-men",
  "sports-c-women": "sports-conjuntos-women",
  "sports-c-men": "sports-conjuntos-men",
  "lounge-s-women": "lounge-superiores-women",
  "lounge-s-men": "lounge-superiores-men",
  "lounge-i-women": "lounge-inferiores-women",
  "lounge-i-men": "lounge-inferiores-men",
  "lounge-c-women": "lounge-conjuntos-women",
  "lounge-c-men": "lounge-conjuntos-men",
  "summer-r": "summer-roupa",
  "summer-b": "summer-banho",
  "acessorios-j": "jewellery",
  "acessorios-b": "bags",
  "acessorios-s": "sunglasses",
  "acessorios-h": "hats"
};

function decodeParts(code: string): Detected | null {
  const [catLetter, partLetter, genderLetter] = code.toLowerCase().split("");
  const category = CATEGORY_LETTER[catLetter];
  if (!category) return null;

  const part = PART_TABLE[category]?.[partLetter];
  if (!part) return null;

  const gender = GENDER_LETTER[genderLetter];
  if (!gender) return null;

  const idKey = part.genderSplit
    ? `${category}-${partLetter}-${gender}`
    : `${category}-${partLetter}`;

  const categoryId = CATEGORY_ID_TABLE[idKey];
  if (!categoryId) return null;

  return { categoryId, category: part.name, gender };
}

// Todos os códigos válidos, gerados a partir das tabelas acima.
const ALL_CODES = Object.entries(CATEGORY_LETTER).flatMap(([catLetter, category]) =>
  Object.keys(PART_TABLE[category] || {}).flatMap((partLetter) =>
    Object.keys(GENDER_LETTER).map((genderLetter) => `${catLetter}${partLetter}${genderLetter}`)
  )
);

const BRACKETED_RE = new RegExp(`[\\(\\[]\\s*(${ALL_CODES.join("|")})\\s*[\\)\\]]`, "i");
// Sem parênteses/colchetes, exige o código todo em maiúsculas — evita apanhar
// palavras normais como "sim" (código SIM) numa frase em minúsculas.
const STANDALONE_RE = new RegExp(`\\b(${ALL_CODES.map((c) => c.toUpperCase()).join("|")})\\b`);

export function detectCategoryFromTitle(title: string): Detected | null {
  const text = String(title || "");

  const bracketed = text.match(BRACKETED_RE);
  const code = bracketed?.[1] || text.match(STANDALONE_RE)?.[1];
  if (!code) return null;

  return decodeParts(code);
}

export function listAutoCategorizeCodes() {
  return ALL_CODES.map((code) => ({ code: code.toUpperCase(), ...decodeParts(code) }));
}
