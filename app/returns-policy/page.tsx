import { getSettings } from "@/lib/settings";

export const dynamic = "force-static";
export const revalidate = 60;

export const metadata = {
  title: "Política de devoluções e reembolsos | Lounge by Gigi",
  description: "Política de devoluções e reembolsos da Lounge by Gigi."
};

export default async function Page() {
  const settings = await getSettings();
  const content = settings.legal?.returns || {};

  return (
    <main className="policy-page">
      <p className="eyebrow">Lounge by Gigi</p>
      <h1>{content.title || "Política de devoluções e reembolsos"}</h1>
      <div className="policy-card">
        <p style={{ whiteSpace: "pre-line" }}>
          {content.body || "Como muitos produtos são produzidos on demand, não aceitamos devoluções por troca de ideia, tamanho escolhido incorretamente ou preferência pessoal, exceto quando indicado por lei aplicável. Se o produto chegar danificado, defeituoso, com erro de fabrico ou diferente do artigo encomendado, contacta-nos com fotografias claras do problema e o número da encomenda. Os parceiros Printful, Printify e Apliiq disponibilizam reprint ou reembolso em casos de dano, defeito ou erro de produção quando o problema é reportado dentro dos prazos aplicáveis, normalmente até 30 dias após a entrega. Cada caso é analisado individualmente."}
        </p>
      </div>
    </main>
  );
}

