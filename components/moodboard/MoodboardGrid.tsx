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

function RailText({ word }: { word: string }) {
  return (
    <span className="lgmm-rail" aria-hidden="true">
      {`${word} `.repeat(14).toUpperCase()}
    </span>
  );
}

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
      {/* Duas colunas de fotografias; o nome da coleção corre na vertical
          na goteira central e na margem direita, colado a cada imagem,
          como na referência. O cartão-selo entra na coluna esquerda. */}
      <section className="lgm-mobile" aria-label={`Moodboard ${label}`}>
        <div className="lgmm-col lgmm-col-left">
          {categories
            .filter((_, index) => index % 2 === 0)
            .map((category, position) => (
              <div key={category.id} className="lgmm-cell">
                <Link href={`/category/${category.id}?from=${gender}`} className="lgmm-tile">
                  <figure className="lgmm-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={category.image} alt={category.name} loading="lazy" />
                  </figure>
                  <p className="lgmm-caption">
                    <span>{category.name}</span>
                    <span>
                      {typeof category.count === "number" && category.count > 0
                        ? `${category.count}`
                        : "→"}
                    </span>
                  </p>
                  <RailText word={label} />
                </Link>
                {position === 0 ? (
                  <div className="lgmm-seal">
                    <SealCard brand={brand} />
                  </div>
                ) : null}
              </div>
            ))}
          {categories.length <= 1 ? (
            <div className="lgmm-seal">
              <SealCard brand={brand} />
            </div>
          ) : null}
        </div>

        <div className="lgmm-col lgmm-col-right">
          {categories
            .filter((_, index) => index % 2 === 1)
            .map((category) => (
              <div key={category.id} className="lgmm-cell">
                <Link href={`/category/${category.id}?from=${gender}`} className="lgmm-tile">
                  <figure className="lgmm-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={category.image} alt={category.name} loading="lazy" />
                  </figure>
                  <p className="lgmm-caption">
                    <span>{category.name}</span>
                    <span>
                      {typeof category.count === "number" && category.count > 0
                        ? `${category.count}`
                        : "→"}
                    </span>
                  </p>
                  <RailText word={label} />
                </Link>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}
