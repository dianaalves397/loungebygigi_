import MediaBlock from "@/components/MediaBlock";
import { getCachedPublicSettings } from "@/lib/cache";

export const revalidate = 3600;

export const metadata = {
  title: "Sobre | Lounge by Gigi",
  description: "Conhece a Lounge by Gigi, uma loja online de moda, swimwear e essentials produzidos on demand."
};

export default async function AboutPage() {
  const settings = await getCachedPublicSettings();
  const about = settings.about || {};

  const title = about.title || "Sobre a Lounge by Gigi";
  const subtitle =
    about.subtitle ||
    "Uma marca online pensada como uma pagina de revista: visual, simples e intencional.";
  const story =
    about.story ||
    "A Lounge by Gigi nasce para reunir pecas de moda, swimwear, essentials e detalhes editoriais num espaco digital limpo e contemporaneo. Muitas pecas sao produzidas on demand atraves de parceiros de fulfilment, ajudando a evitar excesso de stock e permitindo uma selecao em constante evolucao.";
  const mission =
    about.mission ||
    "A nossa missao e criar uma experiencia de compra visual, calma e direta, com produtos selecionados para diferentes estilos, momentos e ritmos.";
  const images =
    about.images?.length
      ? about.images
      : [
          "https://i.postimg.cc/fbMj7BXh/IMG-0386.jpg",
          "https://i.postimg.cc/V6LNtMdJ/IMG-0388.jpg",
          "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1200&auto=format&fit=crop"
        ];

  return (
    <main className="about-magazine">
      <section className="about-hero">
        <div>
          <p className="eyebrow">about</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <MediaBlock type="image" url={images[0]} alt={title} />
      </section>

      <section className="about-editorial-grid">
        <article>
          <p className="eyebrow">story</p>
          <h2>A loja</h2>
          <p>{story}</p>
        </article>

        <MediaBlock type="image" url={images[1] || images[0]} alt="Lounge by Gigi editorial" />

        <MediaBlock type="image" url={images[2] || images[0]} alt="Lounge by Gigi magazine" />

        <article>
          <p className="eyebrow">mission</p>
          <h2>O que defendemos</h2>
          <p>{mission}</p>
        </article>
      </section>

      <section className="about-note">
        <p className="eyebrow">production</p>
        <h2>Producao on demand</h2>
        <p>
          Algumas pecas sao produzidas apenas depois da encomenda, atraves de
          parceiros como Printful e Printify. Isto permite trabalhar com inventario
          flexivel e reduzir desperdicio, mantendo a experiencia dentro da Lounge by Gigi.
        </p>
      </section>
    </main>
  );
}

