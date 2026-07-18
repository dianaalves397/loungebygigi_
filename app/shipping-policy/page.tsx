import { getSettings } from "@/lib/settings";

export const dynamic = "force-static";
export const revalidate = 60;

export const metadata = {
  title: "Política de envios | Lounge by Gigi",
  description: "Política de envios da Lounge by Gigi."
};

export default async function Page() {
  const settings = await getSettings();
  const content = settings.legal?.shipping || {};

  return (
    <main className="policy-page">
      <p className="eyebrow">Lounge by Gigi</p>
      <h1>{content.title || "Política de envios"}</h1>
      <div className="policy-card">
        <p style={{ whiteSpace: "pre-line" }}>
          {content.body || "As encomendas da Lounge by Gigi podem ser produzidas on demand através de parceiros de fulfilment como Printful, Printify e Apliiq. O tempo total de entrega inclui tempo de produção e tempo de envio. A produção pode variar conforme produto, disponibilidade, local de produção e época do ano. Em média, Printful indica 2 a 5 dias úteis de fulfillment e Printify indica geralmente 2 a 7 dias úteis de produção antes do envio. Depois da produção, o prazo de transporte depende do país, método de envio e transportadora. Quando a encomenda for enviada, sempre que disponível, será enviado o respetivo tracking."}
        </p>
      </div>
    </main>
  );
}

