// Secções editoriais depois do moodboard (estilo "shop by" da SKIMS):
// blocos grandes, imagem ou vídeo de fundo, nome por cima, a apontar para
// uma categoria/subcategoria ou uma lista de produtos escolhida no painel.
// A imagem/vídeo de cada bloco não vem de um campo de URL — vem sempre de
// /home-sections/{id}.jpg (ou .mp4 para vídeo), fixe: basta a Diana colocar
// o ficheiro com esse nome no GitHub (pasta public/home-sections).

import Link from "next/link";

export type HomeSection = {
  id: string;
  name: string;
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

export default function HomeSections({
  sections,
  gender
}: {
  sections: HomeSection[];
  gender: string;
}) {
  const visible = (sections || []).filter((section) => section?.id && section?.name);
  if (!visible.length) return null;

  return (
    <section className="lg-homesections" aria-label="Secções da coleção">
      {visible.map((section) => {
        const isVideo = section.mediaType === "video";
        const src = `/home-sections/${section.id}.${isVideo ? "mp4" : "jpg"}`;

        return (
          <Link key={section.id} href={resolveHref(section, gender)} className="lg-homesection">
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
              <span className="lg-homesection-cta">Explorar →</span>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
