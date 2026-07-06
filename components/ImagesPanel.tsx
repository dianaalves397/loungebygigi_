"use client";

// Imagens do site — tudo num só sítio.
// Página de entrada (Woman | Man), página "Sobre" e imagem de cada categoria.
// Aceita URLs externos (Printful, Unsplash, postimg, ...) ou caminhos locais
// como /image_tenis.jpg. Ao guardar, o site público atualiza em segundos.

import { useEffect, useState } from "react";

type Cat = { [key: string]: any };

export default function ImagesPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [landing, setLanding] = useState<any>({
    womanImage: "",
    manImage: "",
    womanLabel: "Woman",
    manLabel: "Man"
  });
  const [aboutImages, setAboutImages] = useState<string[]>(["", "", ""]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    try {
      const settingsRes = await fetch("/api/settings", {
        cache: "no-store",
        credentials: "include"
      });

      if (settingsRes.status === 401) {
        setAuthed(false);
        return;
      }
      setAuthed(true);

      const settings = await settingsRes.json();
      setLanding({
        womanImage: settings?.landing?.womanImage || "",
        manImage: settings?.landing?.manImage || "",
        womanLabel: settings?.landing?.womanLabel || "Woman",
        manLabel: settings?.landing?.manLabel || "Man"
      });

      const about = settings?.about || {};
      const images = Array.isArray(about.images) ? about.images : [];
      setAboutImages([images[0] || "", images[1] || "", images[2] || ""]);

      const categoriesRes = await fetch("/api/categories", {
        cache: "no-store",
        credentials: "include"
      });
      const data = await categoriesRes.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setMessage("Erro ao carregar. Atualiza a página.");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveLandingAndAbout() {
    setBusy(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        landing,
        about: { images: aboutImages.filter(Boolean) }
      })
    });
    setBusy(false);
    setMessage(
      res.ok
        ? "Imagens guardadas. O site atualiza em segundos."
        : "Erro ao guardar as imagens."
    );
  }

  function updateCategoryImage(id: string, image: string) {
    setCategories((current) =>
      current.map((category) => (category.id === id ? { ...category, image } : category))
    );
  }

  async function saveCategoryImage(category: Cat) {
    setBusy(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...category, originalId: category.id })
    });
    setBusy(false);
    setMessage(
      res.ok
        ? `Imagem de "${category.name}" guardada.`
        : `Erro ao guardar a imagem de "${category.name}".`
    );
  }

  if (authed === false) {
    return (
      <main className="control-shell">
        <section className="control-main">
          <div className="control-panel">
            <h2>Sessão necessária</h2>
            <p className="muted">
              Entra primeiro no <a href="/lounge-atelier-772">painel principal</a> e volta a esta página.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="control-shell">
      <aside className="control-sidebar">
        <h1>lounge control</h1>
        <a className="pill" href="/lounge-atelier-772">Painel principal</a>
        <a className="pill" href="/lounge-atelier-772/shop-customization">Categorias</a>
        <a className="pill" href="/lounge-atelier-772/pages">Páginas de conteúdo</a>
        <a className="pill" href="/">Ver site</a>
      </aside>

      <section className="control-main">
        {message ? <p className="control-message">{message}</p> : null}

        <div className="control-panel">
          <p className="eyebrow">entrada</p>
          <h2>Página de entrada (Woman | Man)</h2>
          <p className="muted">
            Se um campo ficar vazio, o site usa a fotografia local por defeito
            (/image_casal_gelado.jpg e /image_tenis.jpg — grátis e rápidas).
          </p>

          <div className="form-grid">
            <label>
              Imagem do painel Woman (URL)
              <input
                value={landing.womanImage}
                onChange={(event) => setLanding({ ...landing, womanImage: event.target.value })}
                placeholder="/image_casal_gelado.jpg"
              />
            </label>

            <label>
              Imagem do painel Man (URL)
              <input
                value={landing.manImage}
                onChange={(event) => setLanding({ ...landing, manImage: event.target.value })}
                placeholder="/image_tenis.jpg"
              />
            </label>

            <label>
              Título do painel Woman
              <input
                value={landing.womanLabel}
                onChange={(event) => setLanding({ ...landing, womanLabel: event.target.value })}
              />
            </label>

            <label>
              Título do painel Man
              <input
                value={landing.manLabel}
                onChange={(event) => setLanding({ ...landing, manLabel: event.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="control-panel">
          <p className="eyebrow">sobre</p>
          <h2>Imagens da página "Sobre"</h2>

          <div className="form-grid">
            {aboutImages.map((value, index) => (
              <label key={index}>
                Imagem {index + 1} (URL)
                <input
                  value={value}
                  onChange={(event) => {
                    const next = [...aboutImages];
                    next[index] = event.target.value;
                    setAboutImages(next);
                  }}
                  placeholder="https://..."
                />
              </label>
            ))}

            <button
              className="pill dark-pill"
              type="button"
              disabled={busy}
              onClick={saveLandingAndAbout}
            >
              Guardar entrada + sobre
            </button>
          </div>
        </div>

        <div className="control-panel">
          <p className="eyebrow">coleções</p>
          <h2>Imagens das categorias</h2>
          <p className="muted">
            Estas imagens aparecem no moodboard e no topo de cada página de
            categoria. Guarda uma de cada vez.
          </p>

          {categories.map((category) => (
            <div className="form-grid" key={category.id} style={{ marginBottom: 18 }}>
              <label>
                {category.name}
                {category.parentId ? ` (subcategoria de ${category.parentId})` : ""}
                <input
                  value={category.image || ""}
                  onChange={(event) => updateCategoryImage(category.id, event.target.value)}
                  placeholder="https://..."
                />
              </label>
              <button
                className="pill"
                type="button"
                disabled={busy}
                onClick={() => saveCategoryImage(category)}
              >
                Guardar "{category.name}"
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
