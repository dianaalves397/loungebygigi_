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

// Devolve uma lista porque um único código pode implicar mais do que uma
// categoria: nas secções com peças separadas por género (sports/lounge) não
// existe um "Peças superiores unisexo" à parte — um código unisexo aí entra
// nas duas (mulher e homem) em vez de ficar sem categoria válida nenhuma.
function decodeParts(code: string): Detected[] {
  const [catLetter, partLetter, genderLetter] = code.toLowerCase().split("");
  const category = CATEGORY_LETTER[catLetter];
  if (!category) return [];

  const part = PART_TABLE[category]?.[partLetter];
  if (!part) return [];

  const gender = GENDER_LETTER[genderLetter];
  if (!gender) return [];

  if (part.genderSplit && gender === "unisex") {
    const results: Detected[] = [];
    for (const eachGender of ["women", "men"] as const) {
      const categoryId = CATEGORY_ID_TABLE[`${category}-${partLetter}-${eachGender}`];
      if (categoryId) results.push({ categoryId, category: part.name, gender: eachGender });
    }
    return results;
  }

  const idKey = part.genderSplit
    ? `${category}-${partLetter}-${gender}`
    : `${category}-${partLetter}`;

  const categoryId = CATEGORY_ID_TABLE[idKey];
  if (!categoryId) return [];

  return [{ categoryId, category: part.name, gender }];
}

// Todos os códigos válidos, gerados a partir das tabelas acima.
const ALL_CODES = Object.entries(CATEGORY_LETTER).flatMap(([catLetter, category]) =>
  Object.keys(PART_TABLE[category] || {}).flatMap((partLetter) =>
    Object.keys(GENDER_LETTER).map((genderLetter) => `${catLetter}${partLetter}${genderLetter}`)
  )
);

// Globais (podem apanhar mais que um código no mesmo título — ex: um produto
// pode pertencer a duas categorias, "(SSM)(LIM)").
const BRACKETED_RE_GLOBAL = new RegExp(`[\\(\\[]\\s*(${ALL_CODES.join("|")})\\s*[\\)\\]]`, "gi");
// Sem parênteses/colchetes, exige o código todo em maiúsculas — evita apanhar
// palavras normais como "sim" (código SIM) numa frase em minúsculas.
const STANDALONE_RE_GLOBAL = new RegExp(`\\b(${ALL_CODES.map((c) => c.toUpperCase()).join("|")})\\b`, "g");

// Versões "de remoção": incluem os espaços/parênteses à volta do código para
// que, ao apagar o código do título, não fique um espaço duplo ou parênteses vazios.
const BRACKETED_STRIP_RE_GLOBAL = new RegExp(`\\s*[\\(\\[]\\s*(?:${ALL_CODES.join("|")})\\s*[\\)\\]]`, "gi");
const STANDALONE_STRIP_RE_GLOBAL = new RegExp(`\\s*\\b(?:${ALL_CODES.map((c) => c.toUpperCase()).join("|")})\\b\\s*`, "g");

// Todos os códigos presentes no título (bracketed e standalone, sem duplicados),
// para produtos que pertencem a mais do que uma categoria.
function findAllCodes(title: string): string[] {
  const text = String(title || "");
  const codes = new Set<string>();

  for (const match of text.matchAll(BRACKETED_RE_GLOBAL)) codes.add(match[1].toLowerCase());
  for (const match of text.matchAll(STANDALONE_RE_GLOBAL)) codes.add(match[1].toLowerCase());

  return Array.from(codes);
}

export function detectCategoryFromTitle(title: string): Detected | null {
  return detectCategoriesFromTitle(title)[0] || null;
}

export function detectCategoriesFromTitle(title: string): Detected[] {
  return findAllCodes(title).flatMap((code) => decodeParts(code));
}

// Remove todos os códigos de categorização do título para exibição ao cliente
// (os códigos continuam a ser lidos do título original antes desta limpeza).
export function stripCategoryCode(title: string): string {
  const text = String(title || "");

  const cleaned = text
    .replace(BRACKETED_STRIP_RE_GLOBAL, " ")
    .replace(STANDALONE_STRIP_RE_GLOBAL, " ");

  return cleaned
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–—|,:]+\s*/, "")
    .replace(/\s*[-–—|,:]+$/, "")
    .trim();
}

export function listAutoCategorizeCodes() {
  return ALL_CODES.map((code) => ({ code: code.toUpperCase(), categories: decodeParts(code) }));
}
