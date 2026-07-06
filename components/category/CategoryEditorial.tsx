"use client";

// Página de categoria — hero cinematográfico a ecrã inteiro onde o 3D é a
// própria página (como as referências): título gigante fragmentado, com
// partes ATRÁS do objeto 3D e partes à FRENTE, texto editorial ao lado e,
// ao fazer scroll, regresso ao papel claro com as peças.

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { AmbientTheme } from "@/components/category/AmbientScene";

const AmbientScene = dynamic(() => import("@/components/category/AmbientScene"), {
  ssr: false,
  loading: () => null
});

// cenário completo de court (modelo Women → Sports)
const CourtScene = dynamic(() => import("@/components/category/CourtScene"), {
  ssr: false,
  loading: () => null
});

const THEMES: Record<string, AmbientTheme> = {
  riviera: { key: "riviera", light: "#ffd9a0" },
  gilded: { key: "gilded", light: "#ffdf9e" },
  court: { key: "court", light: "#f0e8c8" },
  silk: { key: "silk", light: "#ffe4b8" },
  atelier: { key: "atelier", light: "#ffe4b8" }
};

function pickTheme(id: string, name: string, parentId?: string): AmbientTheme {
  // subcategorias herdam o cenário da categoria-mãe quando não têm match próprio
  const text = `${id} ${name} ${parentId || ""}`.toLowerCase();
  if (/(swim|beach|summer|bikini|resort|sea|riviera|sail|praia|ver[aã]o)/.test(text)) return THEMES.riviera;
  if (/(jewel|joia|gold|ouro|watch|rel[oó]gio|acess[oó]rio|bag|sunglass|hat)/.test(text)) return THEMES.gilded;
  if (/(sport|desporto|tennis|t[eé]nis|golf|active|gym|run)/.test(text)) return THEMES.court;
  if (/(lounge|shape|top|dress|vestido|silk|noite|sleep|underwear)/.test(text)) return THEMES.silk;
  return THEMES.atelier;
}

// Divide o nome em 2-3 fragmentos para o título entrelaçado (ME / DU / SA)
function fragmentName(name: string): string[] {
  const clean = String(name || "").trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) return words.slice(0, 3);

  const word = words[0] || "";
  if (word.length <= 4) return [word];
  if (word.length <= 7) {
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid), word.slice(mid)];
  }
  const third = Math.ceil(word.length / 3);
  return [word.slice(0, third), word.slice(third, third * 2), word.slice(third * 2)];
}

type SubCategory = { id: string; name: string; count: number };

export default function CategoryEditorial({
  category,
  products,
  subcategories,
  backHref,
  parent
}: {
  category: any;
  products: any[];
  subcategories: SubCategory[];
  backHref: string;
  parent?: { id: string; name: string } | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const theme = pickTheme(String(category.id || ""), String(category.name || ""), String(category.parentId || ""));
  const fragments = fragmentName(String(category.name || ""));

  // paralaxe do rato: alimenta os produtos integrados no cenário
  const heroRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const onMove = (event: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = (event.clientY / window.innerHeight) * 2 - 1;
        hero.style.setProperty("--px", x.toFixed(3));
        hero.style.setProperty("--py", y.toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // o WebGL entra depois do primeiro paint
  useEffect(() => {
    const idle = (window as any).requestIdleCallback || ((fn: any) => setTimeout(fn, 300));
    const handle = idle(() => setSceneReady(true));
    return () => {
      const cancel = (window as any).cancelIdleCallback || clearTimeout;
      cancel(handle);
    };
  }, []);

  // revelação dos produtos
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

  const intro = category.introText || category.introTitle || "";
  const sideWord = (parent?.name || "Lounge").toUpperCase();

  return (
    <div className="lgc" ref={rootRef}>
      {/* ============ HERO CINEMATOGRÁFICO ============ */}
      <section className={`lgc-cine lgc-cine-${theme.key}`} ref={heroRef}>
        {/* título — camada ATRÁS do 3D */}
        <div className="lgc-cine-type lgc-cine-back" aria-hidden="true">
          {fragments[0] ? <span className="lgc-frag lgc-frag-1">{fragments[0]}</span> : null}
          {fragments[2] ? <span className="lgc-frag lgc-frag-3">{fragments[2]}</span> : null}
        </div>

        {sceneReady ? (
          theme.key === "court" ? <CourtScene /> : <AmbientScene theme={theme} />
        ) : null}

        {/* título — camada à FRENTE do 3D */}
        <div className="lgc-cine-type lgc-cine-front" aria-hidden="true">
          {fragments[1] ? <span className="lgc-frag lgc-frag-2">{fragments[1]}</span> : null}
        </div>

        {/* título acessível (invisível) */}
        <h1 className="lgc-sr">{category.name}</h1>

        {/* migalhas discretas */}
        <nav className="lgc-cine-crumbs" aria-label="Navegação">
          <Link href={backHref}>Coleção</Link>
          {parent ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/category/${parent.id}`}>{parent.name}</Link>
            </>
          ) : null}
        </nav>

        {/* bloco lateral: letras na vertical + texto editorial */}
        <aside className="lgc-cine-side">
          <span className="lgc-cine-stack" aria-hidden="true">
            {sideWord.split("").slice(0, 8).map((letter, index) => (
              <em key={index}>{letter}</em>
            ))}
          </span>
          <p>
            {intro ||
              `${category.name} — peças selecionadas da Lounge by Gigi, pensadas para durar mais do que uma estação.`}
          </p>
        </aside>

        <a className="lgc-cine-cue" href="#pecas">
          Descobrir
        </a>
      </section>

      {/* ============ CORPO EM PAPEL ============ */}
      <div className="lgc-body" id="pecas">
        {subcategories.length || parent ? (
          <nav className="lgc-tabs" aria-label="Subcategorias">
            {parent ? (
              <Link href={`/category/${parent.id}`} className="lgc-tab">
                ← {parent.name}
              </Link>
            ) : null}
            <span className="lgc-tab lgc-tab-active" aria-current="page">
              Tudo
            </span>
            {subcategories.map((sub) => (
              <Link key={sub.id} href={`/category/${sub.id}`} className="lgc-tab">
                {sub.name}
                {sub.count ? <em>{sub.count}</em> : null}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="lgc-count">
          <h2>As peças</h2>
          <span>
            {products.length} {products.length === 1 ? "artigo" : "artigos"}
          </span>
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
            Esta coleção está a ser preparada. Volta em breve — ou explora o resto da loja.
          </p>
        )}
      </div>
    </div>
  );
}
