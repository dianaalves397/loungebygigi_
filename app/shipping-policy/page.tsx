import { getSettings } from "@/lib/settings";

export const dynamic = "force-static";
export const revalidate = 60;

export const metadata = {
  title: "Politica de envios | Lounge by Gigi",
  description: "Politica de envios da Lounge by Gigi."
};

export default async function Page() {
  const settings = await getSettings();
  const content = settings.legal?.shipping || {};

  return (
    <main className="policy-page">
      <p className="eyebrow">Lounge by Gigi</p>
      <h1>{content.title || "Politica de envios"}</h1>
      <div className="policy-card">
        <p style={{ whiteSpace: "pre-line" }}>
          {content.body || "As encomendas da Lounge by Gigi podem ser produzidas on demand atraves de parceiros de fulfilment como Printful e Printify. O tempo total de entrega inclui tempo de producao e tempo de envio. A producao pode variar conforme produto, disponibilidade, local de producao e epoca do ano. Em media, Printful indica 2 a 5 dias uteis de fulfillment e Printify indica geralmente 2 a 7 dias uteis de producao antes do envio. Depois da producao, o prazo de transporte depende do pais, metodo de envio e transportadora. Quando a encomenda for enviada, sempre que disponivel, sera enviado o respetivo tracking."}
        </p>
      </div>
    </main>
  );
}

