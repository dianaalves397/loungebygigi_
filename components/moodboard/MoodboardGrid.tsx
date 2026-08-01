"use client";

// Moodboard de coleção — dois layouts fiéis às referências:
// • Telemóvel: colagem vertical apertada, imagens a tocar nas margens,
//   nome da categoria repetido na vertical no espaço branco ao lado.
// • Computador: faixa horizontal calma ("MOODBOARD" em cima, coleção em
//   baixo) com cartões altos que continuam para fora do ecrã e um botão
//   para fazer scroll e revelar as categorias seguintes.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MoodCategory = {
  id: string;
  name: string;
  image: string;
  introTitle?: string;
  count?: number;
};

function SealCard({ brand, className }: { brand: string; className?: string }) {
  return (
    <div className={`lgm-seal-card ${className || ""}`} aria-hidden="true">
      <span className="lgm-seal-ring" />
      <p className="lgm-seal-caption">
        {brand}
        <em>collections</em>
      </p>
    </div>
  );
}

export default function MoodboardGrid({
  categories,
  brand,
  label,
  gender
}: {
  categories: MoodCategory[];
  brand: string;
  label: string;
  gender: string;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  function updateArrows() {
    const strip = stripRef.current;
    if (!strip) return;
    setCanLeft(strip.scrollLeft > 8);
    setCanRight(strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 8);
  }

  useEffect(() => {
    updateArrows();
    const strip = stripRef.current;
    if (!strip) return;
    strip.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      strip.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [categories.length]);

  function scrollStrip(direction: 1 | -1) {
    const strip = stripRef.current;
    if (!strip) return;
    const card = strip.querySelector<HTMLElement>(".lgm-card");
    const step = card ? card.offsetWidth + 48 : strip.clientWidth * 0.6;
    strip.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <>
      {/* ===================== COMPUTADOR ===================== */}
      <section className="lgm-desktop" aria-label={`Moodboard ${label}`}>
        <p className="lgm-word lgm-word-top">Moodboard</p>

        <div className="lgm-strip-wrap">
          {canLeft ? (
            <button
              type="button"
              className="lgm-arrow lgm-arrow-left"
              onClick={() => scrollStrip(-1)}
              aria-label="Categorias anteriores"
            >
              ←
            </button>
          ) : null}

          <div className="lgm-strip" ref={stripRef}>
            <div className="lgm-strip-spacer" aria-hidden="true" />
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/category/${category.id}?from=${gender}`}
                className="lgm-card"
              >
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={category.image} alt={category.name} loading="lazy" />
                </figure>
                <p className="lgm-card-caption">
                  <span>{category.name}</span>
                  <span>
                    {typeof category.count === "number" && category.count > 0
                      ? `${category.count} ${category.count === 1 ? "peça" : "peças"}`
                      : "Ver peças"}
                  </span>
                </p>
              </Link>
            ))}
            <div className="lgm-card lgm-card-seal" aria-hidden="true">
              <SealCard brand={brand} />
            </div>
            <div className="lgm-strip-spacer" aria-hidden="true" />
          </div>

          {canRight ? (
            <button
              type="button"
              className="lgm-arrow lgm-arrow-right"
              onClick={() => scrollStrip(1)}
              aria-label="Ver mais categorias"
            >
              →
            </button>
          ) : null}
        </div>

        <p className="lgm-word lgm-word-bottom">
          {label} — {brand}
        </p>
      </section>

      {/* ===================== TELEMÓVEL ===================== */}
      {/* Uma coluna só: fotos a toda a largura, empilhadas com espaço
          generoso entre elas e uma legenda pequena e discreta por baixo
          de cada uma — como numa colagem/lookbook editorial. */}
      <section className="lgm-mobile" aria-label={`Moodboard ${label}`}>
        <div className="lgmm-list">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.id}?from=${gender}`}
              className="lgmm-tile"
            >
              <figure className="lgmm-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={category.image} alt={category.name} loading="lazy" />
              </figure>
              <p className="lgmm-caption">
                <span>{category.name}</span>
                <span>
                  {typeof category.count === "number" && category.count > 0
                    ? `${category.count} ${category.count === 1 ? "peça" : "peças"}`
                    : "Ver peças"}
                </span>
              </p>
            </Link>
          ))}
        </div>

        <div className="lgmm-seal">
          <SealCard brand={brand} />
        </div>
      </section>
    </>
  );
}
