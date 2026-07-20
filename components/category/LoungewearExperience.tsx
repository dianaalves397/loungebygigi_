"use client";

// LOUNGEWEAR — A FLORAÇÃO (vídeo conduzido pelo scroll).
// O vídeo real da flor a desabrochar está preso ao scroll: descer avança,
// subir recua, parar congela o frame — a meio do scroll estás a meio do
// vídeo. À medida que a flor abre, anotações editoriais apontam para zonas
// da flor (linhas finas + títulos, como numa prancha botânica futurista).
// Se o vídeo falhar, entra o jardim 3D como plano B.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import SortControl from "@/components/category/SortControl";
import GridDensityControl from "@/components/category/GridDensityControl";
import FlowerGarden from "@/components/category/FlowerGarden";

type SubCategory = { id: string; name: string; count: number };

const THEMES = {
  woman: {
    accent: "#d9a7b0",
    petalTones: [
      ["#d9a7a4", "#8e4a4d"],
      ["#e6c9c2", "#a4696b"],
      ["#b9c4c9", "#6f8591"]
    ],
    script: "a arte de estar."
  },
  man: {
    accent: "#c9b478",
    petalTones: [
      ["#c8b98a", "#8a6f34"],
      ["#a9b39a", "#5c6b4f"],
      ["#8d9aa4", "#4d5b66"]
    ],
    script: "a mesma arte, mais sóbria."
  }
} as const;

// anotações: [janela, lado, topo%, título, texto]
const NOTES: Array<{
  window: [number, number, number, number];
  side: "left" | "right";
  top: number;
  title: string;
  text: string;
}> = [
  {
    window: [0.05, 0.1, 0.2, 0.26],
    side: "left",
    top: 56,
    title: "O botão",
    text: "Tudo começa fechado — uma flor, uma coleção. O primeiro gesto é sempre o de abrir."
  },
  {
    window: [0.24, 0.3, 0.4, 0.46],
    side: "right",
    top: 40,
    title: "A primeira pétala",
    text: "Malha que respira, algodão com o peso certo — conforto que não pede licença para sair à rua."
  },
  {
    window: [0.44, 0.5, 0.6, 0.66],
    side: "left",
    top: 34,
    title: "O coração",
    text: "No centro, o essencial: cortes limpos, costuras invisíveis, nada a mais."
  },
  {
    window: [0.64, 0.7, 0.8, 0.86],
    side: "right",
    top: 52,
    title: "A flor aberta",
    text: "Peças que acompanham o dia inteiro — do primeiro café ao último capítulo."
  },
  {
    window: [0.86, 0.9, 0.97, 1],
    side: "left",
    top: 62,
    title: "O jardim",
    text: "As peças esperam, já a seguir."
  }
];

function windowOpacity(progress: number, a: number, b: number, c: number, d: number) {
  if (progress <= a || progress >= d) return 0;
  if (progress < b) return (progress - a) / Math.max(b - a, 0.0001);
  if (progress > c) return 1 - (progress - c) / Math.max(d - c, 0.0001);
  return 1;
}

export default function LoungewearExperience({
  category,
  products,
  subcategories,
  backHref,
  parent,
  variant = "woman"
}: {
  category: any;
  products: any[];
  subcategories: SubCategory[];
  backHref: string;
  parent?: { id: string; name: string } | null;
  variant?: "woman" | "man";
}) {
  const theme = THEMES[variant];
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef(0);
  const [videoOk, setVideoOk] = useState(true);
  const [videoSrc, setVideoSrc] = useState<{ src: string; poster: string } | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);

  // horizontal para computador, vertical para telemóvel
  useEffect(() => {
    const pick = () => {
      const portrait = window.matchMedia("(max-width: 760px)").matches;
      setVideoSrc(
        portrait
          ? { src: "/flowers/bloom-v.mp4", poster: "/flowers/bloom-poster-v.jpg" }
          : { src: "/flowers/bloom-h.mp4", poster: "/flowers/bloom-poster-h.jpg" }
      );
    };
    pick();
  }, []);

  // Traz o vídeo inteiro para memória (blob) em vez de depender do browser ir
  // buscando bocados enquanto se faz scroll — assim que chega, o scrub por
  // scroll é instantâneo e fiável independentemente da rede ou de ser a
  // primeira visita (que era exatamente quando isto falhava antes).
  useEffect(() => {
    if (!videoSrc) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    fetch(videoSrc.src)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setVideoBlobUrl(objectUrl);
      })
      .catch(() => {
        setVideoOk(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoSrc]);

  // desbloqueio de seek no iOS (um toque basta)
  useEffect(() => {
    const unlock = () => {
      const video = videoRef.current;
      if (video) video.play().then(() => video.pause()).catch(() => {});
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", unlock);
  }, []);

  // scroll → frame do vídeo + camadas
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const run = root.querySelector<HTMLElement>(".lw-run");
    const layers = Array.from(root.querySelectorAll<HTMLElement>(".lw-layer"));
    const cue = root.querySelector<HTMLElement>(".lw-cue");
    if (!run) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = run.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      progressRef.current = progress;

      const video = videoRef.current;
      if (video && video.readyState >= 1 && Number.isFinite(video.duration)) {
        const target = reduced ? video.duration * 0.7 : progress * video.duration;
        // só reposiciona se a diferença compensa (evita seeks em cascata)
        if (Math.abs(video.currentTime - target) > 0.033) {
          video.currentTime = target;
        }
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

    // Numa primeira visita (sem cache), o vídeo pode demorar a expor
    // readyState/duration — sem isto o scroll não "agarra" o vídeo até à
    // próxima interação. Este polling curto tenta sincronizar assim que o
    // vídeo fica pronto, mesmo que o utilizador já tenha parado de fazer scroll.
    const readyPoll = window.setInterval(() => {
      const video = videoRef.current;
      if (video && video.readyState >= 1 && Number.isFinite(video.duration)) {
        update();
        window.clearInterval(readyPoll);
      }
    }, 200);
    const readyTimeout = window.setTimeout(() => window.clearInterval(readyPoll), 20000);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      window.clearInterval(readyPoll);
      window.clearTimeout(readyTimeout);
    };
  }, [videoOk]);

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
      className={`lw lw-${variant}`}
      ref={rootRef}
      style={{ ["--lw-accent" as any]: theme.accent }}
    >
      <section className="lw-run" aria-label="A floração">
        <div className="lw-sticky">
          {videoOk && videoSrc ? (
            <video
              ref={videoRef}
              className="lw-video"
              src={videoBlobUrl || undefined}
              poster={videoSrc.poster}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={() => window.dispatchEvent(new Event("scroll"))}
              onLoadedData={() => window.dispatchEvent(new Event("scroll"))}
              onCanPlay={() => window.dispatchEvent(new Event("scroll"))}
              onDurationChange={() => window.dispatchEvent(new Event("scroll"))}
              onError={() => setVideoOk(false)}
            />
          ) : videoOk ? null : (
            <FlowerGarden progressRef={progressRef} variant={variant} />
          )}

          <nav className="sm-crumbs lw-crumbs" aria-label="Navegação">
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

          <header className="lw-layer lw-title" data-window="0,0,0.08,0.16">
            <p className="lw-kicker">Édition Fleurs — N.º 01</p>
            <h1>{category.name}</h1>
            <p className="lw-script">{theme.script}</p>
          </header>

          {NOTES.map((note, index) => (
            <aside
              key={index}
              className={`lw-layer lw-note lw-note-${note.side}`}
              data-window={note.window.join(",")}
              style={{ top: `${note.top}%` }}
            >
              <p className="lw-note-title">{note.title}</p>
              <p className="lw-note-text">{note.text}</p>
            </aside>
          ))}

          <div className="sm-hold-cue lw-cue">
            <span>A floração</span>
          </div>
        </div>
      </section>

      {/* ---- as peças ---- */}
      <div className="lgc-body lw-body" id="pecas">
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
