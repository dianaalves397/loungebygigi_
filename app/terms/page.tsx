import { getSettings } from "@/lib/settings";

export const dynamic = "force-static";
export const revalidate = 60;

export const metadata = {
  title: "Termos e condições | Lounge by Gigi",
  description: "Termos e condições da Lounge by Gigi."
};

export default async function Page() {
  const settings = await getSettings();
  const content = settings.legal?.terms || {};

  return (
    <main className="policy-page">
      <p className="eyebrow">Lounge by Gigi</p>
      <h1>{content.title || "Termos e condições"}</h1>
      <div className="policy-card">
        <p style={{ whiteSpace: "pre-line" }}>
          {content.body || "Ao usar a Lounge by Gigi, concordas com estes termos. Os produtos, preços, imagens e disponibilidade podem ser atualizados a qualquer momento. Produtos produzidos on demand só entram em produção depois da confirmação da encomenda e pagamento. A Lounge by Gigi pode recusar ou cancelar encomendas em caso de erro técnico, suspeita de fraude, dados incorretos ou indisponibilidade do produto. As informações do site são fornecidas de boa fé e podem ser ajustadas para melhorar a experiência do cliente."}
        </p>
      </div>
    </main>
  );
}

