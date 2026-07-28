// Integração PrintKK (print-on-demand).
//
// Esquema de autenticação confirmado pela documentação oficial da PrintKK
// (https://dashboard.printkk.com → Setting → Api Management → docs):
//
//   1. Todos os pedidos levam o header "api-key" com a chave da conta.
//   2. Todos os pedidos levam "timestamp" e "recvWindow" como parâmetros
//      (query string em GET/DELETE, corpo JSON em POST/PUT).
//   3. Assinatura: junta TODOS os parâmetros (query + corpo, o que for
//      aplicável ao pedido) num só conjunto, remove os vazios/nulos, junta
//      arrays em string separada por vírgulas, ordena as chaves
//      alfabeticamente, e constrói:
//        "{MÉTODO}\n{CAMINHO}\nchave1=valor1&chave2=valor2&..."
//      Essa string é assinada com HMAC-SHA256 usando a secret key da conta,
//      em hexadecimal — esse resultado é o parâmetro "signature", que entra
//      também no conjunto de parâmetros (query em GET/DELETE, corpo em
//      POST/PUT).
//
// Verificado contra o exemplo oficial (GET /api/v1/general/ping com
// recvWindow=5000 e timestamp=1750233945814): a string a assinar dá
// exatamente "GET\n/api/v1/general/ping\nrecvWindow=5000&timestamp=1750233945814".
//
// Ao contrário da Printful/Printify/Apliiq, a PrintKK não tem (pelo que a
// documentação descreve) um catálogo de produtos já configurados para
// sincronizar diretamente para a loja — o fluxo deles é por-encomenda
// (escolhe-se um produto em branco do catálogo deles, sobe-se uma imagem,
// cria-se um "design", e só depois uma encomenda). Por isso esta integração
// não tem sincronização automática de catálogo; serve para submeter
// encomendas de produtos que já tenham um printkkDesignId associado.

import crypto from "crypto";

const BASE_URL = "https://api.printkk.com";

export function getPrintkkConfig(settings: any) {
  const c = settings?.integrations?.printkk || {};
  return {
    enabled: Boolean(c.enabled),
    apiKey: c.apiKey || "",
    secretKey: c.secretKey || "",
    autoSubmitOrders: c.autoSubmitOrders !== false
  };
}

function buildSignedParamString(params: Record<string, any>) {
  const filtered: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    filtered[key] = Array.isArray(value) ? value.join(",") : String(value);
  }

  return Object.keys(filtered)
    .sort()
    .map((key) => `${key}=${filtered[key]}`)
    .join("&");
}

function sign(secretKey: string, method: string, path: string, params: Record<string, any>) {
  const paramString = buildSignedParamString(params);
  const signString = `${method.toUpperCase()}\n${path}\n${paramString}`;
  return crypto.createHmac("sha256", secretKey).update(signString).digest("hex");
}

// GET/DELETE: parâmetros (incluindo a assinatura) vão na query string.
// POST/PUT: parâmetros (incluindo a assinatura) vão no corpo JSON.
export async function printkkRequest(
  config: any,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  params: Record<string, any> = {}
) {
  if (!config.apiKey || !config.secretKey) {
    throw new Error("PrintKK: chave API ou secret key em falta.");
  }

  const withTiming = {
    ...params,
    timestamp: params.timestamp || String(Date.now()),
    recvWindow: params.recvWindow || "5000"
  };
  const signature = sign(config.secretKey, method, path, withTiming);
  const allParams = { ...withTiming, signature };

  const headers: Record<string, string> = {
    Accept: "application/json",
    "api-key": config.apiKey
  };

  let url = `${BASE_URL}${path}`;
  let body: string | undefined;

  if (method === "GET" || method === "DELETE") {
    const qs = Object.entries(allParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join("&");
    url += `?${qs}`;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(allParams);
  }

  const res = await fetch(url, { method, headers, body, cache: "no-store" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Erro PrintKK: ${res.status} ${res.statusText}`);
  }

  return data;
}

// Endpoint oficial de teste de ligação (ver documentação).
export async function testPrintkkConnection(config: any) {
  const data = await printkkRequest(config, "GET", "/api/v1/general/ping");
  return { ok: true, data };
}
