import { getSettings } from "@/lib/settings";

export const dynamic = "force-static";
export const revalidate = 60;

export const metadata = {
  title: "Política de privacidade | Lounge by Gigi",
  description: "Política de privacidade da Lounge by Gigi."
};

export default async function Page() {
  const settings = await getSettings();
  const content = settings.legal?.privacy || {};

  return (
    <main className="policy-page">
      <p className="eyebrow">Lounge by Gigi</p>
      <h1>{content.title || "Política de privacidade"}</h1>
      <div className="policy-card">
        <p style={{ whiteSpace: "pre-line" }}>
          {content.body || "A Lounge by Gigi recolhe apenas os dados necessários para processar encomendas, pagamentos, contacto com o cliente e suporte. Estes dados podem incluir nome, email, morada de envio, telefone, detalhes da encomenda e informação de pagamento processada por fornecedores seguros como Stripe ou PayPal. Não vendemos os teus dados pessoais. Os dados podem ser partilhados com parceiros essenciais para concluir a encomenda, como plataformas de pagamento, produção, envio e suporte."}
        </p>
      </div>
    </main>
  );
}

