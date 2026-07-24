"use client";

// ÉDITION ÉTÉ — a revista nas mãos de alguém.
// Abertura: uma fotografia real (a leitora no barco / o fotógrafo na praia).
// O scroll faz ZOOM na revista dentro da fotografia até a página encher o
// ecrã — e a partir daí desce-se pela LOUNGE como numa Vogue em papel:
// masthead, feature com capitular, citação manuscrita, colagem com
// fita-cola, página de compras impressa (produtos reais como elementos da
// página) e o arquivo. Cada painel anima ao entrar no ecrã — banda
// desenhada editorial, sem cartoons.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import SortControl from "@/components/category/SortControl";
import GridDensityControl from "@/components/category/GridDensityControl";
import { EDITIONS } from "@/components/category/editions";
import { getVideoBlobUrl } from "@/lib/videoBlobCache";

type SubCategory = { id: string; name: string; count: number };

export default function SummerExperience({
  category,
  products,
  subcategories,
  backHref,
  parent,
  edition = "summer",
  from
}: {
  category: any;
  products: any[];
  subcategories: SubCategory[];
  backHref: string;
  parent?: { id: string; name: string } | null;
  edition?: "summer" | "summerMan";
  from?: string;
}) {
  const withFrom = (path: string) => (from ? `${path}?from=${from}` : path);
  const config = EDITIONS[edition];
  const rootRef = useRef<HTMLDivElement>(null);

  // ---- abertura: o filme da costa, preso ao scroll (frame ↔ posição) ----
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<{ src: string; poster: string } | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoBlobFailed, setVideoBlobFailed] = useState(false);

  useEffect(() => {
    const portrait = window.matchMedia("(max-width: 760px)").matches;
    setVideoSrc(
      portrait
        ? { src: "/editorial/film-summer-v.mp4", poster: "/editorial/film-summer-v-poster.jpg" }
        : { src: "/editorial/film-summer-h.mp4", poster: "/editorial/film-summer-h-poster.jpg" }
    );
  }, []);

  // Traz o vídeo inteiro para memória (blob) em vez de depender do browser ir
  // buscando bocados enquanto se faz scroll — assim que chega, o scrub por
  // scroll é instantâneo e fiável independentemente da rede ou de ser a
  // primeira visita (que era exatamente quando isto falhava antes). Usa o
  // Cache Storage do browser: quem já visitou esta categoria antes não volta
  // a pedir o vídeo ao servidor. Só se isto falhar é que se cai para o
  // carregamento direto (uma única tentativa cada vez, nunca os dois pedidos
  // em simultâneo).
  useEffect(() => {
    if (!videoSrc) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    getVideoBlobUrl(videoSrc.src)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setVideoBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setVideoBlobFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoSrc]);

  // desbloqueio de seek no iOS
  useEffect(() => {
    const unlock = () => {
      const video = videoRef.current;
      if (video) video.play().then(() => video.pause()).catch(() => {});
    };
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", unlock);
  }, []);

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
  }, [videoSrc]);

  // ---- painéis da revista animam ao entrar (BD editorial) ----
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".sm-reveal, .lgc-reveal"));
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

  const accent = config.accent || "#5d1f22";
  const photos = config.sources;
  const spread = config.spread;
  const shopping = products.filter((product) => product.image || product.title).slice(0, 3);

  return (
    <div className="sm" ref={rootRef} style={{ ["--sm-accent" as any]: accent }}>
      {/* ============ abertura: o filme da costa, preso ao scroll ============ */}
      <section className="film-run" aria-label="Abertura da edição">
        <div className="film-sticky">
          {videoSrc ? (
            <video
              ref={videoRef}
              className="film-video"
              src={videoBlobUrl || (videoBlobFailed ? videoSrc.src : undefined)}
              poster={videoSrc.poster}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={() => window.dispatchEvent(new Event("scroll"))}
              onLoadedData={() => window.dispatchEvent(new Event("scroll"))}
              onCanPlay={() => window.dispatchEvent(new Event("scroll"))}
              onDurationChange={() => window.dispatchEvent(new Event("scroll"))}
            />
          ) : null}

          <nav className="sm-crumbs" aria-label="Navegação">
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

          <div className="film-layer film-cap film-cap-left" data-window="0.05,0.12,0.32,0.42">
            <p className="film-kicker">Costa Amalfitana</p>
            <p className="film-line">Agosto visto do mar.</p>
          </div>

          <div className="film-layer film-cap film-cap-right" data-window="0.5,0.58,0.82,0.92">
            <p className="film-kicker">A bordo</p>
            <p className="film-line">A edição começa onde a estrada acaba.</p>
          </div>

          <div className="sm-hold-cue film-cue">
            <span>Entrar na edição</span>
          </div>
        </div>
      </section>

      {/* ============ a revista: desce-se pela LOUNGE ============ */}
      <section className="sm-mag" id="edicao">
        {/* masthead */}
        <header className="sm-masthead sm-reveal">
          <p className="sm-kicker">{config.cover.kicker}</p>
          <h1>Lounge</h1>
          <p className="sm-script">{config.cover.italic}</p>
        </header>

        {/* feature: fotografia + texto com capitular */}
        <article className="sm-feature">
          <figure className="sm-reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[spread.photo]} alt={spread.photoCaption} loading="lazy" />
            <figcaption>{spread.photoCaption}</figcaption>
          </figure>
          <div className="sm-feature-text">
            <h2 className="sm-reveal">
              {spread.headline[0]} {spread.headline[1]}
            </h2>
            <div className="sm-cols sm-reveal">
              {spread.col1.map((text, index) => (
                <p key={index} className={index === 0 ? "sm-dropcap" : undefined}>
                  {text}
                </p>
              ))}
              {spread.col2.map((text, index) => (
                <p key={`b${index}`}>{text}</p>
              ))}
            </div>
          </div>
        </article>

        {/* citação manuscrita */}
        <blockquote className="sm-pull sm-reveal">
          {config.chapters.spreadQuote[0]} {config.chapters.spreadQuote[1]}
        </blockquote>

        {/* histórias extra: foto/texto à Vogue */}
        {(config.stories || []).map((block, index) => {
          if (block.kind === "interlude") {
            return (
              <figure className="sm-inter sm-reveal" key={`st${index}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photos[block.photo]} alt="" loading="lazy" />
                <figcaption>{block.caption}</figcaption>
              </figure>
            );
          }
          if (block.kind === "duo") {
            return (
              <article className="sm-duo" key={`st${index}`}>
                <div className="sm-duo-photos">
                  {block.photos.map((photo, photoIndex) => (
                    <figure key={photoIndex} className="sm-reveal" style={{ transitionDelay: `${photoIndex * 120}ms` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photos[photo]} alt="" loading="lazy" />
                      <figcaption>{block.captions[photoIndex]}</figcaption>
                    </figure>
                  ))}
                </div>
                <div className="sm-story-text sm-reveal">
                  <h2>{block.title}</h2>
                  {block.paragraphs.map((text, textIndex) => (
                    <p key={textIndex} className={textIndex === 0 ? "sm-dropcap" : undefined}>{text}</p>
                  ))}
                </div>
              </article>
            );
          }
          return (
            <article className={`sm-story${block.flip ? " sm-story-flip" : ""}`} key={`st${index}`}>
              <figure className="sm-reveal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photos[block.photo]} alt={block.caption} loading="lazy" />
                <figcaption>{block.caption}</figcaption>
              </figure>
              <div className="sm-story-text sm-reveal">
                <h2>{block.title}</h2>
                {block.paragraphs.map((text, textIndex) => (
                  <p key={textIndex} className={textIndex === 0 ? "sm-dropcap" : undefined}>{text}</p>
                ))}
              </div>
            </article>
          );
        })}

        {/* colagem com fita-cola */}
        <section className="sm-collage" aria-label="Colagem da edição">
          <p className="sm-kicker sm-reveal">{config.collage.word}</p>
          <div className="sm-collage-board">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[config.collage.base]} alt="" className="sm-collage-base sm-reveal" loading="lazy" />
            {config.collage.fragments.slice(0, 2).map((fragment, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={photos[fragment.photo]}
                alt=""
                loading="lazy"
                className={`sm-frag sm-frag-${index + 1} sm-reveal`}
                style={{ ["--tilt" as any]: `${fragment.tilt * 60}deg` }}
              />
            ))}
          </div>
        </section>

        {/* página de compras: produtos impressos como elementos da página */}
        {shopping.length ? (
          <section className="sm-shop" aria-label="As escolhas da edição">
            <h3 className="sm-reveal">{config.shopping?.title || "As escolhas da edição"}</h3>
            <ol>
              {shopping.map((product, index) => (
                <li key={product.id} className="sm-reveal" style={{ transitionDelay: `${index * 120}ms` }}>
                  <Link href={`/product/${product.slug}`}>
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt="" loading="lazy" />
                    ) : null}
                    <span className="sm-shop-n">N.º 0{index + 1}</span>
                    <span className="sm-shop-title">{product.title}</span>
                    {product.price !== undefined && product.price !== null && String(product.price) !== "" ? (
                      <em>€ {product.price}</em>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ol>
            <p className="sm-shop-note sm-reveal">{config.shopping?.note}</p>
          </section>
        ) : null}

        {/* arquivo */}
        <section className="sm-archive" aria-label="Arquivo">
          {config.triptych.map((item, index) => (
            <figure key={index} className="sm-reveal" style={{ transitionDelay: `${index * 110}ms` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[item.photo]} alt={item.caption} loading="lazy" />
              <figcaption>{item.caption}</figcaption>
            </figure>
          ))}
        </section>

        <footer className="sm-folio sm-reveal">
          <span>{config.cover.footer}</span>
          <span>28</span>
        </footer>
      </section>

      {/* ============ as peças ============ */}
      <div className="lgc-body sm-body" id="pecas">
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
