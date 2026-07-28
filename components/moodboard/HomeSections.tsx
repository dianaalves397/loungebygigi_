// Secções editoriais depois do moodboard (estilo "shop by categoria" de
// referências como a SKIMS/temas de activewear): blocos grandes, imagem ou
// vídeo de fundo, nome (+ subtítulo e botão opcionais) por cima, a apontar
// para uma categoria/subcategoria ou uma lista de produtos escolhida no
// painel. A imagem/vídeo de cada bloco não vem de um campo de URL — vem
// sempre de /home-sections/{id}.jpg (ou .mp4 para vídeo): basta colocar o
// ficheiro com esse nome no GitHub (pasta public/home-sections).
//
// "width: full" = banner a toda a largura (uma linha só, texto à esquerda,
// como um hero). "width: half" = dois blocos lado a lado sem espaço entre
// eles, texto centrado — dois "half" seguidos emparelham automaticamente
// na mesma linha; um "half" sozinho no fim ocupa a linha toda sozinho.

import Link from "next/link";

export type HomeSectionFontStyle = "serif-italic" | "serif-upright" | "sans-bold" | "sans-light";
export type HomeSectionWidth = "full" | "half";

export type HomeSection = {
  id: string;
  name: string;
  subtitle?: string;
  ctaLabel?: string;
  fontStyle?: HomeSectionFontStyle;
  width?: HomeSectionWidth;
  mediaType?: "image" | "video";
  targetType?: "category" | "products";
  categoryId?: string;
  productIds?: string[];
};

function resolveHref(section: HomeSection, gender: string) {
  if (section.targetType === "products" && section.productIds?.length) {
    return `/shop?ids=${section.productIds.map(encodeURIComponent).join(",")}`;
  }
  if (section.categoryId) {
    return `/category/${section.categoryId}?from=${gender}`;
  }
  return `/shop?gender=${gender}`;
}

function groupIntoRows(sections: HomeSection[]) {
  const rows: HomeSection[][] = [];
  let i = 0;
  while (i < sections.length) {
    const current = sections[i];
    const next = sections[i + 1];
    if (current.width === "half" && next?.width === "half") {
      rows.push([current, next]);
      i += 2;
    } else {
      rows.push([current]);
      i += 1;
    }
  }
  return rows;
}

function SectionBlock({ section, gender }: { section: HomeSection; gender: string }) {
  const isVideo = section.mediaType === "video";
  const src = `/home-sections/${section.id}.${isVideo ? "mp4" : "jpg"}`;
  const fontStyle = section.fontStyle || "serif-italic";
  const align = section.width === "half" ? "center" : "left";

  return (
    <Link
      href={resolveHref(section, gender)}
      className={`lg-homesection lg-homesection--${fontStyle} lg-homesection--${align}`}
    >
      <div className="lg-homesection-media">
        {isVideo ? (
          <video src={src} muted loop playsInline autoPlay preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={section.name} loading="lazy" />
        )}
      </div>
      <div className="lg-homesection-caption">
        <span className="lg-homesection-name">{section.name}</span>
        {section.subtitle ? <span className="lg-homesection-subtitle">{section.subtitle}</span> : null}
        {section.ctaLabel ? <span className="lg-homesection-cta">{section.ctaLabel}</span> : null}
      </div>
    </Link>
  );
}

export default function HomeSections({
  sections,
  gender
}: {
  sections: HomeSection[];
  gender: string;
}) {
  const visible = (sections || []).filter((section) => section?.id && section?.name);
  if (!visible.length) return null;

  const rows = groupIntoRows(visible);

  return (
    <section className="lg-homesections" aria-label="Secções da coleção">
      {rows.map((row, index) => (
        <div className="lg-homerow" key={row.map((s) => s.id).join("-") || index}>
          {row.map((section) => (
            <SectionBlock key={section.id} section={section} gender={gender} />
          ))}
        </div>
      ))}
    </section>
  );
}
