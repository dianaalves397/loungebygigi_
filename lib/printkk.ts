// Integração PrintKK (print-on-demand).
//
// IMPORTANTE — isto foi escrito sem acesso à documentação técnica exata da
// PrintKK (o esquema de assinatura/autenticação está atrás de um login e o
// site bloqueia o acesso direto a partir daqui). O fluxo documentado
// publicamente é: autenticar → upload de imagem → criar design → criar
// encomenda → pagamento. Está implementado um pedido HTTP real de teste de
// ligação e de submissão de encomenda, com o header de autenticação mais
// comum para este tipo de API (Bearer token com a chave secreta) — mas isto
// é a parte que mais provavelmente vai precisar de ajuste assim que houver
// uma chave real para testar contra a resposta verdadeira da PrintKK.
//
// Ao contrário da Printful/Printify/Apliiq, a PrintKK não tem (pelo que a
// documentação pública descreve) um catálogo de produtos já configurados
// para sincronizar diretamente para a loja — o fluxo deles é por-encomenda
// (escolhes um produto em branco do catálogo deles, sobes uma imagem, criam
// um "design", e só depois criam a encomenda). Por isso esta integração não
// tem sincronização automática de catálogo (como a Printful tem); serve para
// submeter encomendas de produtos que já tenham um printkkDesignId associado.

const BASE_URL = "https://api.printkk.com";

export function getPrintkkConfig(settings: any) {
  const c = settings?.integrations?.printkk || {};
  return {
    enabled: Boolean(c.enabled),
    apiKey: c.apiKey || "",
    autoSubmitOrders: c.autoSubmitOrders !== false
  };
}

async function pk(config: any, path: string, init?: RequestInit) {
  if (!config.apiKey) {
    throw new Error("PrintKK: chave API em falta.");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Erro PrintKK: ${res.status} ${res.statusText}`
    );
  }

  return data;
}

// Ping simples para validar a chave — tenta listar o catálogo de produtos
// em branco (o endpoint mais provável de existir e não ter efeitos
// secundários). Se o caminho real for diferente, isto vai devolver 404 e o
// botão "Testar ligação" mostra esse erro tal como veio da PrintKK, o que
// ajuda a corrigir o caminho certo depois de ligar uma chave real.
export async function testPrintkkConnection(config: any) {
  const data = await pk(config, "/api/v1/products");
  const count = Array.isArray(data) ? data.length : Array.isArray(data?.data) ? data.data.length : undefined;
  return { ok: true, count };
}
