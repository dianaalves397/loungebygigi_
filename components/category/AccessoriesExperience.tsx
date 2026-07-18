"use client";

// ACESSÓRIOS — O FILME DOS OBJETOS (a toalha, o livro, o ouro).
// O vídeo está preso ao scroll: descer avança, subir recua, parar congela.
// Ao longo do filme, anotações editoriais com linhas finas apontam para o
// que está em cena — os objetos que fazem um verão.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import SortControl from "@/components/category/SortControl";
import GridDensityControl from "@/components/category/GridDensityControl";

type SubCategory = { id: string; name: string; count: number };

const VARIANTS = {
  sea: { accent: "#c9a24b", cue: "Os objetos do verão" },
  sun: { accent: "#8a6f34", cue: "Os objetos do verão" }
} as const;

// anotações do filme da toalha
const NOTES: Array<{
  window: [number, number, number, number];
  side: "left" | "right";
  top: number;
  title: string;
  text: string;
}> = [
  {
    window: [0.05, 0.11, 0.22, 0.3],
    side: "left",
    top: 30,
    title: "A toalha",
    text: "O verão instala-se primeiro nos objetos: uma toalha estendida é uma declaração de intenções."
  },
  {
    window: [0.28, 0.35, 0.46, 0.54],
    side: "right",
    top: 42,
    title: "O livro",
    text: "Páginas onduladas pelo sal — a única pressa é a de virar mais uma."
  },
  {
    window: [0.52, 0.59, 0.7, 0.78],
    side: "left",
    top: 56,
    title: "O ouro",
    text: "Uns brincos, um anel: ao meio-dia, o sol concentra-se no que é pequeno."
  },
  {
    window: [0.76, 0.82, 0.9, 0.96],
    side: "right",
    top: 36,
    title: "A sombra",
    text: "O verdadeiro luxo é uma tarde inteira sem relógio."
  },
  {
    window: [0.9, 0.94, 0.98, 1],
    side: "left",
    top: 64,
    title: "As peças",
    text: "Já a seguir."
  }
];

export default function AccessoriesExperience({
  category,
  products,
  subcategories,
  backHref,
  parent,
  variant = "sea"
}: {
  category: any;
  products: any[];
  subcategories: SubCategory[];
  backHref: string;
  parent?: { id: string; name: string } | null;
  variant?: "sea" | "sun";
}) {
  const config = VARIANTS[variant];
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<{ src: string; poster: string } | null>(null);
  const [videoOk, setVideoOk] = useState(true);

  useEffect(() => {
    const portrait = window.matchMedia("(max-width: 760px)").matches;
    setVideoSrc(
      portrait
        ? { src: "/editorial/film-acc-v.mp4", poster: "/editorial/film-acc-v-poster.jpg" }
        : { src: "/editorial/film-acc-h.mp4", poster: "/editorial/film-acc-h-poster.jpg" }
    );
  }, []);

  // desbloqueio de seek no iOS
  useEffect(() => {
    const unlock = () => {
      const video = videoRef.current;
      if (video) video.play().then(() => video.pause()).catch(() => {});
    };
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", unlock);
  }, []);

  // scroll ↔ frame + anotações
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const run = root.querySelector<HTMLElement>(".film-run");
    const layers = Array.from(root.querySelectorAll<HTMLElement>(".film-layer"));
    const cue = root.querySelector<HTMLElement>(".film-cue");
    if (!run) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const windowOpacity = (progress: number, a: number, b: number, c: number, d: number) => {
      if (progress <= a || progress >= d) return 0;
      if (progress < b) return (progress - a) / Math.max(b - a, 0.0001);
      if (progress > c) return 1 - (progress - c) / Math.max(d - c, 0.0001);
      return 1;
    };

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = run.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      const video = videoRef.current;
      if (video && video.readyState >= 1 && Number.isFinite(video.duration)) {
        const target = reduced ? video.duration * 0.6 : progress * video.duration;
        if (Math.abs(video.currentTime - target) > 0.033) video.currentTime = target;
      }
      layers.forEach((layer) => {
        const [a, b, c, d] = (layer.dataset.window || "0,0,1,1").split(",").map(Number);
        const opacity = windowOpacity(progress, a, b, c, d);
        layer.style.opacity = String(opacity);
        layer.style.transform = `translateY(${(1 - opacity) * 14}px)`;
      });
      if (cue) cue.style.opacity = String(Math.max(0, 1 - progress * 8));
    };
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
  }, [videoSrc]);

  // reveal das peças
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
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`ax ax-${variant}`}
      ref={rootRef}
      style={{ ["--film-accent" as any]: config.accent }}
    >
      <section className="film-run" aria-label="Os objetos do verão">
        <div className="film-sticky">
          {videoSrc && videoOk ? (
            <video
              ref={videoRef}
              className="film-video"
              src={videoSrc.src}
              poster={videoSrc.poster}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={() => window.dispatchEvent(new Event("scroll"))}
              onError={() => setVideoOk(false)}
            />
          ) : videoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={videoSrc.poster} alt="" className="film-video" />
          ) : null}

          <nav className="sm-crumbs" aria-label="Navegação">
            <Link href={backHref}>Coleção</Link>
            {parent ? (
              <>
                <span aria-hidden="true">/</span>
                <Link href={`/category/${parent.id}`}>{parent.name}</Link>
              </>
            ) : null}
            <span aria-hidden="true">/</span>
            <span>{category.name}</span>
          </nav>

          {NOTES.map((note, index) => (
            <aside
              key={index}
              className={`film-layer film-note film-note-${note.side}`}
              data-window={note.window.join(",")}
              style={{ top: `${note.top}%` }}
            >
              <p className="film-note-title">{note.title}</p>
              <p className="film-note-text">{note.text}</p>
            </aside>
          ))}

          <div className="sm-hold-cue film-cue">
            <span>{config.cue}</span>
          </div>
        </div>
      </section>

      <div className="lgc-body ax-body" id="pecas">
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
            Esta coleção está a ser preparada. Volta em breve — ou explora o resto da loja.
          </p>
        )}
      </div>
    </div>
  );
}
