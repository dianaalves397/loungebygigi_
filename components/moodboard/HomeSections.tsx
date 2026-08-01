// Secções editoriais depois do moodboard, com 3 tipos de bloco (campo
// "type"), inspirados numa apresentação/lookbook de marca:
//
// - "banner" (o original): imagem/vídeo de fundo, nome + subtítulo/botão
//   opcionais por cima. Vem de /home-sections/{id}.jpg (ou .mp4).
//   "width: full" = toda a largura, texto à esquerda. "width: half" = dois
//   blocos lado a lado (emparelham automaticamente), texto centrado.
//
// - "gallery": legenda pequena nos cantos (nome/subtítulo), e por baixo
//   uma fiada de 3 ou 5 fotos lado a lado. Por omissão ("source: custom")
//   vêm de /home-sections/{id}-1.jpg, {id}-2.jpg, ... até ao número
//   escolhido. Com "source: recent" mostram, em vez disso, os produtos
//   adicionados mais recentemente à loja (imagem + nome reais), sempre
//   atualizados sem precisar de editar nada.
//
// - "heading": só texto (nome + subtítulo/botão opcionais) num bloco liso,
//   sem imagem — para separar secções, como um título de capítulo.
//
// Em qualquer dos casos, o bloco aponta para uma categoria/subcategoria ou
// uma lista de produtos escolhida no painel.

import Link from "next/link";

export type HomeSectionFontStyle = "serif-italic" | "serif-upright" | "sans-bold" | "sans-light" | "script";
export type HomeSectionWidth = "full" | "half";
export type HomeSectionType = "banner" | "gallery" | "heading";
export type HomeSectionGallerySource = "custom" | "recent";

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
  type?: HomeSectionType;
  imageCount?: number;
  gallerySource?: HomeSectionGallerySource;
};

type RecentProduct = {
  id: string;
  slug: string;
  title: string;
  image: string;
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
    const currentIsBanner = (current.type || "banner") === "banner";
    const nextIsBanner = next ? (next.type || "banner") === "banner" : false;
    if (currentIsBanner && current.width === "half" && nextIsBanner && next?.width === "half") {
      rows.push([current, next]);
      i += 2;
    } else {
      rows.push([current]);
      i += 1;
    }
  }
  return rows;
}

function BannerBlock({ section, gender }: { section: HomeSection; gender: string }) {
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

function GalleryBlock({
  section,
  gender,
  recentProducts
}: {
  section: HomeSection;
  gender: string;
  recentProducts: RecentProduct[];
}) {
  const fontStyle = section.fontStyle || "serif-italic";
  const count = section.imageCount === 5 ? 5 : 3;
  const href = resolveHref(section, gender);
  const isRecent = section.gallerySource === "recent";
  const items = isRecent ? recentProducts.slice(0, count) : Array.from({ length: count });

  return (
    <div className={`lg-homegallery lg-homesection--${fontStyle}`}>
      {section.name ? (
        <div className="lg-homegallery-title">
          <span className="lg-homesection-name">{section.name}</span>
          {section.subtitle ? <span className="lg-homesection-subtitle">{section.subtitle}</span> : null}
        </div>
      ) : null}
      <div className="lg-homegallery-row">
        {items.map((item: any, index) => {
          const itemHref = isRecent ? `/product/${item.slug}` : href;
          const src = isRecent ? item.image : `/home-sections/${section.id}-${index + 1}.jpg`;
          const alt = isRecent ? item.title : section.name || "";

          return (
            <Link href={itemHref} className="lg-homegallery-item" key={isRecent ? item.id : index}>
              <span className="lg-homegallery-item-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} loading="lazy" />
              </span>
              {isRecent ? <span className="lg-homegallery-item-caption">{item.title}</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function HeadingBlock({ section, gender }: { section: HomeSection; gender: string }) {
  const fontStyle = section.fontStyle || "serif-italic";

  return (
    <Link href={resolveHref(section, gender)} className={`lg-homeheading lg-homesection--${fontStyle}`}>
      <span className="lg-homesection-name">{section.name}</span>
      {section.subtitle ? <span className="lg-homesection-subtitle">{section.subtitle}</span> : null}
      {section.ctaLabel ? <span className="lg-homesection-cta">{section.ctaLabel}</span> : null}
    </Link>
  );
}

function SectionRenderer({
  section,
  gender,
  recentProducts
}: {
  section: HomeSection;
  gender: string;
  recentProducts: RecentProduct[];
}) {
  const type = section.type || "banner";
  if (type === "gallery") return <GalleryBlock section={section} gender={gender} recentProducts={recentProducts} />;
  if (type === "heading") return <HeadingBlock section={section} gender={gender} />;
  return <BannerBlock section={section} gender={gender} />;
}

export default function HomeSections({
  sections,
  gender,
  recentProducts
}: {
  sections: HomeSection[];
  gender: string;
  recentProducts?: RecentProduct[];
}) {
  const visible = (sections || []).filter((section) => section?.id && (section?.name || section?.type === "gallery"));
  if (!visible.length) return null;

  const rows = groupIntoRows(visible);

  return (
    <section className="lg-homesections" aria-label="Secções da coleção">
      {rows.map((row, index) => (
        <div className="lg-homerow" key={row.map((s) => s.id).join("-") || index}>
          {row.map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              gender={gender}
              recentProducts={recentProducts || []}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
