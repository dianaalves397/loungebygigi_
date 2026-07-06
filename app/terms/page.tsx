import { getSettings } from "@/lib/settings";

export const dynamic = "force-static";
export const revalidate = 60;

export const metadata = {
  title: "Termos e condicoes | Lounge by Gigi",
  description: "Termos e condicoes da Lounge by Gigi."
};

export default async function Page() {
  const settings = await getSettings();
  const content = settings.legal?.terms || {};

  return (
    <main className="policy-page">
      <p className="eyebrow">Lounge by Gigi</p>
      <h1>{content.title || "Termos e condicoes"}</h1>
      <div className="policy-card">
        <p style={{ whiteSpace: "pre-line" }}>
          {content.body || "Ao usar a Lounge by Gigi, concordas com estes termos. Os produtos, precos, imagens e disponibilidade podem ser atualizados a qualquer momento. Produtos produzidos on demand so entram em producao depois da confirmacao da encomenda e pagamento. A Lounge by Gigi pode recusar ou cancelar encomendas em caso de erro tecnico, suspeita de fraude, dados incorretos ou indisponibilidade do produto. As informacoes do site sao fornecidas de boa fe e podem ser ajustadas para melhorar a experiencia do cliente."}
        </p>
      </div>
    </main>
  );
}

