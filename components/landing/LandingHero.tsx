"use client";

// Entrada da loja: ecrã inteiro, Woman | Man, transição cinematográfica.
// As imagens vêm das definições (painel → Página de entrada) com fallback
// para as fotografias locais em /public (zero egress externo).

import Link from "next/link";

function Seal({ brand }: { brand: string }) {
  const ring = `· ${brand} · elevated essentials `.toUpperCase();
  return (
    <>
      <svg viewBox="0 0 200 200" fill="none">
        <defs>
          <path id="lg-seal-path" d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="96" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
        <circle cx="100" cy="100" r="62" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
        <text fontSize="12.5" letterSpacing="3.5" fill="currentColor" opacity="0.9" style={{ fontFamily: "var(--lg-body)" }}>
          <textPath href="#lg-seal-path">{ring}</textPath>
        </text>
      </svg>
      <div className="lg-seal-core">
        <strong>Lounge</strong>
        <span>by Gigi</span>
      </div>
    </>
  );
}

export default function LandingHero({
  womanImage,
  manImage,
  womanLabel,
  manLabel,
  brandName
}: {
  womanImage: string;
  manImage: string;
  womanLabel: string;
  manLabel: string;
  brandName: string;
}) {
  return (
    <section className="lg-landing" aria-label="Escolher coleção">
      <div className="lg-landing-intro" aria-hidden="true">
        <div className="lg-landing-brand-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lounge-logo.jpg" alt="" />
        </div>
      </div>

      <div className="lg-rail left" aria-hidden="true">
        <span>
          {brandName} — {brandName} — {brandName} — {brandName} — {brandName} —
        </span>
      </div>

      <Link href="/collections/women" className="lg-landing-panel" prefetch>
        <div className="lg-landing-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={womanImage} alt="Coleção de mulher" loading="eager" fetchPriority="high" />
        </div>
        <div className="lg-landing-label">
          <span className="lg-eyebrow">A coleção</span>
          <h2>{womanLabel}</h2>
          <span className="lg-enter">Entrar</span>
        </div>
      </Link>

      <div className="lg-landing-divider" aria-hidden="true" />
      <div className="lg-landing-seal" aria-hidden="true">
        <Seal brand={brandName} />
      </div>

      <Link href="/collections/men" className="lg-landing-panel" prefetch>
        <div className="lg-landing-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={manImage} alt="Coleção de homem" loading="eager" fetchPriority="high" />
        </div>
        <div className="lg-landing-label">
          <span className="lg-eyebrow">A coleção</span>
          <h2>{manLabel}</h2>
          <span className="lg-enter">Entrar</span>
        </div>
      </Link>

      <div className="lg-rail right" aria-hidden="true">
        <span>
          est. Lisboa — {brandName} — est. Lisboa — {brandName} — est. Lisboa —
        </span>
      </div>
    </section>
  );
}
