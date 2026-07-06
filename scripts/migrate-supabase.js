// Migração da base de dados antiga para a nova (ambas Supabase).
//
// Como usar (no teu computador, dentro da pasta do projeto):
//   1. npm install
//   2. Definir as 4 variáveis e correr:
//
//   OLD_SUPABASE_URL=https://ANTIGA.supabase.co \
//   OLD_SUPABASE_SERVICE_ROLE_KEY=chave_antiga \
//   NEW_SUPABASE_URL=https://NOVA.supabase.co \
//   NEW_SUPABASE_SERVICE_ROLE_KEY=chave_nova \
//   node scripts/migrate-supabase.js
//
// Em Windows (PowerShell):
//   $env:OLD_SUPABASE_URL="https://ANTIGA.supabase.co"
//   $env:OLD_SUPABASE_SERVICE_ROLE_KEY="chave_antiga"
//   $env:NEW_SUPABASE_URL="https://NOVA.supabase.co"
//   $env:NEW_SUPABASE_SERVICE_ROLE_KEY="chave_nova"
//   node scripts/migrate-supabase.js
//
// Se a base antiga já não existir, não faz mal: o site faz "seed" automático
// a partir de data/*.json na primeira utilização, ou usa o botão no painel.

const { createClient } = require("@supabase/supabase-js");

const KEYS = ["settings", "products", "categories", "orders", "customers"];
// A tabela antiga podia chamar-se "louge_store" (gralha) ou "lounge_store".
const OLD_TABLES = ["lounge_store", "louge_store"];

async function main() {
  const oldUrl = process.env.OLD_SUPABASE_URL;
  const oldKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
  const newUrl = process.env.NEW_SUPABASE_URL;
  const newKey = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

  if (!oldUrl || !oldKey || !newUrl || !newKey) {
    console.error("Faltam variáveis. Vê as instruções no topo deste ficheiro.");
    process.exit(1);
  }

  const oldDb = createClient(oldUrl, oldKey, { auth: { persistSession: false } });
  const newDb = createClient(newUrl, newKey, { auth: { persistSession: false } });

  let rows = null;
  let sourceTable = null;

  for (const table of OLD_TABLES) {
    const { data, error } = await oldDb.from(table).select("key,data,updated_at");
    if (!error && data && data.length) {
      rows = data;
      sourceTable = table;
      break;
    }
  }

  if (!rows) {
    console.error("Não encontrei dados na base antiga (tabelas lounge_store/louge_store vazias ou inexistentes).");
    process.exit(1);
  }

  console.log(`Encontrados ${rows.length} registos na tabela "${sourceTable}" da base antiga.`);

  for (const key of KEYS) {
    const row = rows.find((r) => r.key === key);
    if (!row) {
      console.log(`- ${key}: (não existe na base antiga, ignorado)`);
      continue;
    }
    const { error } = await newDb.from("lounge_store").upsert({
      key,
      data: row.data,
      updated_at: new Date().toISOString()
    });
    if (error) {
      console.error(`- ${key}: ERRO → ${error.message}`);
      process.exitCode = 1;
    } else {
      const size = JSON.stringify(row.data).length;
      console.log(`- ${key}: migrado (${(size / 1024).toFixed(1)} KB)`);
    }
  }

  console.log("\nMigração concluída. Confirma no painel da nova Supabase → Table Editor → lounge_store.");
}

main().catch((error) => {
  console.error("Erro inesperado:", error.message);
  process.exit(1);
});
