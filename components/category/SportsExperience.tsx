"use client";

// LOUNGE — Edição Sports: a revista viva.
// A página inteira é UM cenário contínuo. O scroll não desloca a página —
// conduz a CÂMARA por um percurso dentro do mundo 3D:
//
//   capítulo 0 · a capa — masthead LOUNGE sobre o court ao entardecer
//   capítulo 1 · aproximação — a câmara desce até à rede e à raquete
//   capítulo 2 · a colagem — atravessa a rede e entra numa instalação de
//                recortes de papel rasgado feitos das fotografias da edição,
//                pendurados por fios, a baloiçar
//   capítulo 3 · as impressões — corredor onde os produtos da categoria são
//                impressões da revista integradas na composição
//   capítulo 4 · chegada — a luz abre, o mundo dissolve-se em papel e
//                aterramos nas peças
//
// As fotografias (public/editorial/*) são matéria-prima: recortadas com
// bordas rasgadas geradas em canvas, unificadas em tom sépia, montadas em
// papel e suspensas no espaço. Sem bolas, sem blobs — só objetos com razão.

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef } from "react";
import ProductCard from "@/components/ProductCard";
import SortControl from "@/components/category/SortControl";
import GridDensityControl from "@/components/category/GridDensityControl";
import { EDITIONS } from "@/components/category/editions";

const MagazineWorld = dynamic(() => import("@/components/category/MagazineWorld"), {
  ssr: false,
  loading: () => null
});

type SubCategory = { id: string; name: string; count: number };

// janelas de opacidade por capítulo: [entrada, cheio, cheio, saída]
function windowOpacity(progress: number, a: number, b: number, c: number, d: number) {
  if (progress <= a || progress >= d) return 0;
  if (progress < b) return (progress - a) / (b - a);
  if (progress > c) return 1 - (progress - c) / (d - c);
  return 1;
}

export default function SportsExperience({
  category,
  products,
  subcategories,
  backHref,
  parent,
  edition = "woman",
  from
}: {
  category: any;
  products: any[];
  subcategories: SubCategory[];
  backHref: string;
  parent?: { id: string; name: string } | null;
  edition?: "woman" | "man" | "summer" | "summerMan";
  from?: string;
}) {
  const withFrom = (path: string) => (from ? `${path}?from=${from}` : path);
  const chapters = EDITIONS[edition].chapters;
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  // scroll → progresso da narrativa (0..1) → câmara + camadas DOM
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const track = root.querySelector<HTMLElement>(".sx-track");
    const stage = root.querySelector<HTMLElement>(".sx-stage");
    if (!track || !stage) return;

    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-window]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    function update() {
      raf = 0;
      const rect = track!.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      progressRef.current = progress;

      // o mundo dissolve-se ao chegar às peças
      stage!.style.opacity = String(progress > 0.9 ? Math.max(0, 1 - (progress - 0.9) / 0.08) : 1);
      stage!.style.visibility = progress >= 0.995 ? "hidden" : "visible";

      for (const layer of layers) {
        const [a, b, c, d] = (layer.dataset.window || "0,0,1,1").split(",").map(Number);
        const opacity = windowOpacity(progress, a, b, c, d);
        layer.style.opacity = opacity.toFixed(3);
        layer.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
        if (!reduced) {
          const drift = (1 - opacity) * (progress < (a + d) / 2 ? 30 : -30);
          layer.style.transform = `translateY(${drift.toFixed(1)}px)`;
        }
      }
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // revelação das peças no fim do percurso
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".lgc-reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const intro = category.introText || category.introTitle || chapters.openFallback;

  return (
    <div className={`sx sx-ed-${edition}`} ref={rootRef}>
      {/* ---------- mundo 3D fixo (a câmara é conduzida pelo scroll) ---------- */}
      <div className="sx-stage">
        <MagazineWorld
          progressRef={progressRef}
          edition={edition}
          shopItems={products
            .filter((product) => product.title)
            .slice(0, 3)
            .map((product) => ({
              title: product.title,
              price: product.price,
              image: product.image
            }))}
        />
      </div>

      {/* ---------- camadas editoriais sincronizadas com a narrativa ---------- */}
      <div className="sx-overlays">
        {/* capítulo 0 — a capa */}
        <div className="sx-layer sx-cover" data-window="0,0,0.06,0.16" aria-hidden="false">
          <p className="sx-issue">Edição N.º 01 — {category.name}</p>
          <h1 className="sx-masthead">Lounge</h1>
          <p className="sx-cover-sub">a revista viva da {parent?.name || "coleção"}</p>
          <span className="sx-cue">Entrar na edição</span>
        </div>

        {/* capítulo 1 — a capa vira página */}
        <div className="sx-layer sx-chapter sx-right" data-window="0.14,0.22,0.3,0.4">
          <span className="sx-folio">01 · A abrir</span>
          <p>{intro}</p>
        </div>

        {/* capítulo 2 — o spread */}
        <div className="sx-layer sx-chapter sx-left" data-window="0.32,0.4,0.48,0.56">
          <span className="sx-folio">02 · O spread</span>
          <p className="sx-quote">
            {chapters.spreadQuote[0]}<br />{chapters.spreadQuote[1]}
          </p>
        </div>

        {/* capítulo 3 — a colagem */}
        <div className="sx-layer sx-chapter sx-right" data-window="0.54,0.62,0.72,0.8">
          <span className="sx-folio">03 · A colagem</span>
          <p>{chapters.collage}</p>
        </div>

        {/* capítulo 4 — o arquivo */}
        <div className="sx-layer sx-chapter sx-left" data-window="0.78,0.85,0.9,0.97">
          <span className="sx-folio">04 · O arquivo</span>
          <p className="sx-quote">{chapters.closingQuote[0]}<br />{chapters.closingQuote[1]}</p>
        </div>
      </div>

      {/* navegação discreta, sempre presente */}
      <nav className="sx-crumbs" aria-label="Navegação">
        <Link href={backHref}>Coleção</Link>
        {parent ? (
          <>
            <span aria-hidden="true">/</span>
            <Link href={withFrom(`/category/${parent.id}`)}>{parent.name}</Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span>{category.name}</span>
      </nav>

      {/* ---------- pista de scroll (conduz a câmara) ---------- */}
      <div className="sx-track" />

      {/* ---------- chegada: as peças, em papel ---------- */}
      <div className="lgc-body sx-body" id="pecas">
        {subcategories.length || parent ? (
          <nav className="lgc-tabs" aria-label="Subcategorias">
            {parent ? (
              <Link href={withFrom(`/category/${parent.id}`)} className="lgc-tab">
                ← {parent.name}
              </Link>
            ) : null}
            <span className="lgc-tab lgc-tab-active" aria-current="page">
              Tudo
            </span>
            {subcategories.map((sub) => (
              <Link key={sub.id} href={withFrom(`/category/${sub.id}`)} className="lgc-tab">
                {sub.name}
                {sub.count ? <em>{sub.count}</em> : null}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="lgc-count">
          <h2>As peças</h2>
          <div className="lgc-count-meta">
            <span>
              {products.length} {products.length === 1 ? "artigo" : "artigos"}
            </span>
            <SortControl />
            <GridDensityControl />
          </div>
        </div>

        {products.length ? (
          <div className="lgc-grid">
            {products.map((product, index) => (
              <div
                className="lgc-reveal"
                key={product.id}
                style={{ transitionDelay: `${(index % 4) * 70}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <p className="lgc-empty">
            Esta edição está a ser preparada. Volta em breve — ou explora o resto da loja.
          </p>
        )}
      </div>
    </div>
  );
}
