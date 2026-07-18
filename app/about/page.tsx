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
    "Uma marca online pensada como uma página de revista: visual, simples e intencional.";
  const story =
    about.story ||
    "A Lounge by Gigi nasce para reunir peças de moda, swimwear, essentials e detalhes editoriais num espaço digital limpo e contemporâneo. Muitas peças são produzidas on demand através de parceiros de fulfilment, ajudando a evitar excesso de stock e permitindo uma seleção em constante evolução.";
  const mission =
    about.mission ||
    "A nossa missão é criar uma experiência de compra visual, calma e direta, com produtos selecionados para diferentes estilos, momentos e ritmos.";
  const images =
    about.images?.length
      ? about.images
      : ["/editorial/hold-summer.jpg", "/editorial/hold-wacc.jpg", "/editorial/hold-macc.jpg"];

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
        <h2>Produção on demand</h2>
        <p>
          Algumas peças são produzidas apenas depois da encomenda, através de
          parceiros como Printful, Printify e Apliiq. Isto permite trabalhar com
          inventário flexível e reduzir desperdício, mantendo a experiência dentro
          da Lounge by Gigi.
        </p>
      </section>
    </main>
  );
}

