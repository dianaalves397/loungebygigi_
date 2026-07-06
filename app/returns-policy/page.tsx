import { getSettings } from "@/lib/settings";

export const dynamic = "force-static";
export const revalidate = 60;

export const metadata = {
  title: "Politica de devolucoes e reembolsos | Lounge by Gigi",
  description: "Politica de devolucoes e reembolsos da Lounge by Gigi."
};

export default async function Page() {
  const settings = await getSettings();
  const content = settings.legal?.returns || {};

  return (
    <main className="policy-page">
      <p className="eyebrow">Lounge by Gigi</p>
      <h1>{content.title || "Politica de devolucoes e reembolsos"}</h1>
      <div className="policy-card">
        <p style={{ whiteSpace: "pre-line" }}>
          {content.body || "Como muitos produtos sao produzidos on demand, nao aceitamos devolucoes por troca de ideia, tamanho escolhido incorretamente ou preferencia pessoal, exceto quando indicado por lei aplicavel. Se o produto chegar danificado, defeituoso, com erro de fabrico ou diferente do artigo encomendado, contacta-nos com fotografias claras do problema e o numero da encomenda. Os parceiros Printful e Printify disponibilizam reprint ou reembolso em casos de dano, defeito ou erro de producao quando o problema e reportado dentro dos prazos aplicaveis, normalmente ate 30 dias apos a entrega. Cada caso e analisado individualmente."}
        </p>
      </div>
    </main>
  );
}

