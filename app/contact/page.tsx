import { getSettings } from "@/lib/settings";

export const dynamic = "force-static";
export const revalidate = 60;

export const metadata = {
  title: "Contacto | Lounge by Gigi",
  description: "Contacto da Lounge by Gigi."
};

export default async function Page() {
  const settings = await getSettings();
  const content = settings.legal?.contact || {};

  return (
    <main className="policy-page">
      <p className="eyebrow">Lounge by Gigi</p>
      <h1>{content.title || "Contacto"}</h1>
      <div className="policy-card">
        <p style={{ whiteSpace: "pre-line" }}>
          {content.body || "Para duvidas sobre encomendas, pagamentos, tamanhos, envios ou problemas com produtos, contacta a Lounge by Gigi atraves do email indicado no site ou das redes sociais oficiais da marca. Ao contactar sobre uma encomenda, inclui o numero da encomenda, email usado na compra e fotografias caso estejas a reportar um problema com o produto."}
        </p>
      </div>
    </main>
  );
}

