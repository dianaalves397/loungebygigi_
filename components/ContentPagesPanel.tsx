"use client";

import { useEffect, useState } from "react";

type PageKey = "shipping" | "returns" | "privacy" | "terms" | "contact";

const defaultLegal: Record<PageKey, { title: string; body: string }> = {
  shipping: {
    title: "Política de envios",
    body: "As encomendas podem incluir tempo de produção e tempo de envio."
  },
  returns: {
    title: "Política de devoluções e reembolsos",
    body: "Produtos feitos on demand podem ter regras específicas de devolução."
  },
  privacy: {
    title: "Política de privacidade",
    body: "Recolhemos apenas dados necessários para processar encomendas e contacto."
  },
  terms: {
    title: "Termos e condições",
    body: "Ao usar o site, concordas com os termos da Lounge by Gigi."
  },
  contact: {
    title: "Contacto",
    body: "Contacta-nos para dúvidas sobre produtos, encomendas ou suporte."
  }
};

export default function ContentPagesPanel() {
  const [settings, setSettings] = useState<any>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (res.ok) setSettings(await res.json());
  }

  async function save() {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        about: settings.about,
        legal: settings.legal
      })
    });

    const data = await res.json();

    if (res.ok) {
      setSettings(data);
      setMessage("Paginas guardadas.");
    } else {
      setMessage(data.error || "Erro ao guardar.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (!settings) return <main className="control-login">A carregar...</main>;

  const about = settings.about || {};
  const legal = settings.legal || {};

  function updateAbout(key: string, value: any) {
    setSettings({
      ...settings,
      about: {
        ...about,
        [key]: value
      }
    });
  }

  function updateLegal(page: PageKey, key: string, value: string) {
    setSettings({
      ...settings,
      legal: {
        ...legal,
        [page]: {
          ...(legal[page] || defaultLegal[page]),
          [key]: value
        }
      }
    });
  }

  return (
    <main className="control-shell">
      <aside className="control-sidebar">
        <h1>lounge control</h1>
        <a className="pill" href="/lounge-atelier-772">Painel principal</a>
        <a className="pill" href="/about">Ver Sobre</a>
        <a className="pill" href="/">Ver site</a>
      </aside>

      <section className="control-main">
        {message ? <p className="control-message">{message}</p> : null}

        <div className="control-panel">
          <p className="eyebrow">about page</p>
          <h2>Pagina Sobre</h2>

          <div className="form-grid">
            <Field label="Titulo" value={about.title || ""} onChange={(value) => updateAbout("title", value)} />
            <Field label="Subtitulo" value={about.subtitle || ""} onChange={(value) => updateAbout("subtitle", value)} />

            <label className="wide">
              Historia
              <textarea value={about.story || ""} onChange={(event) => updateAbout("story", event.target.value)} />
            </label>

            <label className="wide">
              Missao
              <textarea value={about.mission || ""} onChange={(event) => updateAbout("mission", event.target.value)} />
            </label>

            <Field
              label="Imagens separadas por virgula"
              value={(about.images || []).join(", ")}
              onChange={(value) =>
                updateAbout(
                  "images",
                  value.split(",").map((item) => item.trim()).filter(Boolean)
                )
              }
            />
          </div>
        </div>

        <div className="control-panel">
          <p className="eyebrow">policies</p>
          <h2>Paginas legais</h2>

          {(Object.keys(defaultLegal) as PageKey[]).map((page) => {
            const current = legal[page] || defaultLegal[page];

            return (
              <div className="policy-editor" key={page}>
                <h3>{current.title}</h3>
                <Field
                  label="Titulo"
                  value={current.title}
                  onChange={(value) => updateLegal(page, "title", value)}
                />
                <label>
                  Texto
                  <textarea
                    value={current.body}
                    onChange={(event) => updateLegal(page, "body", event.target.value)}
                  />
                </label>
              </div>
            );
          })}
        </div>

        <button className="pill dark-pill wide" onClick={save}>
          Guardar paginas
        </button>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
