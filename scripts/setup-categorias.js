// Reorganiza as categorias da TUA base de dados (Supabase) para a nova
// estrutura: Sports, Summer, Loungewear e Acessórios no topo (iguais para
// Woman e Man), com as categorias antigas a tornarem-se subcategorias.
// Os produtos existentes NÃO são alterados — continuam ligados às mesmas
// subcategorias e passam a aparecer também na categoria-mãe.
//
// Como usar (na pasta do projeto, com as variáveis da TUA Supabase):
//   NEXT_PUBLIC_SUPABASE_URL=https://ATUA.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=chave \
//   node scripts/setup-categorias.js
//
// Em Windows (PowerShell):
//   $env:NEXT_PUBLIC_SUPABASE_URL="https://ATUA.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="chave"
//   node scripts/setup-categorias.js

const { createClient } = require("@supabase/supabase-js");

const TOPS = [
  { id: "sports", name: "Sports", gender: "unisex", image: "/image_tenis.jpg", sortOrder: 1,
    introTitle: "Movimento com elegância", introText: "Peças de desporto pensadas para o court, o green e a cidade." },
  { id: "summer", name: "Summer", gender: "unisex", image: "/image_casal_barco.jpg", sortOrder: 2,
    introTitle: "Dias de sal e sol", introText: "O essencial para a época mais longa do ano — do mar ao fim de tarde." },
  { id: "loungewear", name: "Loungewear", gender: "unisex", sortOrder: 3,
    introTitle: "Conforto assinado", introText: "Texturas suaves para os dias em casa — sem abdicar da linha." },
  { id: "acessorios", name: "Acessórios", gender: "unisex", sortOrder: 4,
    introTitle: "Os detalhes que ficam", introText: "Joalharia, malas, óculos e chapéus — o remate de cada conjunto." }
];

// antiga categoria → nova categoria-mãe
const PARENT_OF = {
  "w-sports": "sports",
  "m-sports": "sports",
  "swimwear": "summer",
  "tops": "loungewear",
  "shapewear": "loungewear",
  "jewellery": "acessorios",
  "bags": "acessorios",
  "sunglasses": "acessorios",
  "hats": "acessorios"
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from("lounge_store").select("data").eq("key", "categories").single();
  if (error) {
    console.error("Erro a ler categorias:", error.message);
    process.exit(1);
  }

  const categories = Array.isArray(data?.data) ? data.data : [];
  const byId = new Map(categories.map((category) => [String(category.id), category]));

  // 1) garantir as 4 categorias de topo (sem tocar nas existentes com o mesmo id)
  for (const top of TOPS) {
    const existing = byId.get(top.id);
    if (existing) {
      existing.parentId = "";
      existing.gender = "unisex";
      existing.sortOrder = top.sortOrder;
      if (!existing.introTitle) existing.introTitle = top.introTitle;
      if (!existing.introText) existing.introText = top.introText;
      if (!existing.image && top.image) existing.image = top.image;
      console.log(`= ${top.id}: já existia — promovida a categoria de topo`);
    } else {
      categories.push({ ...top });
      byId.set(top.id, categories[categories.length - 1]);
      console.log(`+ ${top.id}: criada`);
    }
  }

  // 2) mover as antigas para debaixo da mãe certa
  for (const [childId, parentId] of Object.entries(PARENT_OF)) {
    const child = byId.get(childId);
    if (!child) {
      console.log(`  (${childId} não existe — ignorado)`);
      continue;
    }
    child.parentId = parentId;
    console.log(`→ ${childId} passou a subcategoria de ${parentId}`);
  }

  const { error: writeError } = await db.from("lounge_store").upsert({
    key: "categories",
    data: categories,
    updated_at: new Date().toISOString()
  });
  if (writeError) {
    console.error("Erro a gravar:", writeError.message);
    process.exit(1);
  }

  console.log("\nFeito. Abre o site: os moodboards Woman e Man mostram agora");
  console.log("Sports · Summer · Loungewear · Acessórios, cada uma com as suas subcategorias.");
  console.log('Podes criar/editar subcategorias no painel (campo "Categoria-mãe").');
}

main().catch((error) => {
  console.error("Erro inesperado:", error.message);
  process.exit(1);
});
