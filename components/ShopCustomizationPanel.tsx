"use client";

import { useEffect, useState } from "react";

type LayoutSettings = {
  background: string;
  text: string;
  muted: string;
  accent: string;
  card: string;
  radius: number;
  productGridColumns: number;
  categoryCardHeight: number;
  heroHeight: number;
};

const defaults: LayoutSettings = {
  background: "#fbf7f2",
  text: "#211a17",
  muted: "#74665f",
  accent: "#9f8373",
  card: "#ffffff",
  radius: 32,
  productGridColumns: 4,
  categoryCardHeight: 420,
  heroHeight: 88,
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: ".78rem", fontWeight: 600 }}>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 40, height: 36, padding: 2, border: "1px solid rgba(0,0,0,.1)", borderRadius: 8, cursor: "pointer" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, fontFamily: "monospace", fontSize: ".82rem" }}
          maxLength={7}
          placeholder="#000000"
        />
      </div>
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: ".78rem", fontWeight: 600 }}>
        {label} — <strong>{value}{unit}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

export default function ShopCustomizationPanel() {
  const [layout, setLayout] = useState<LayoutSettings>(defaults);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.layout) {
          setLayout({ ...defaults, ...data.layout });
        }
      })
      .catch(() => {});
  }, []);

  // live preview: inject CSS vars into the document while the user edits
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bg", layout.background);
    root.style.setProperty("--text", layout.text);
    root.style.setProperty("--muted", layout.muted);
    root.style.setProperty("--accent", layout.accent);
    root.style.setProperty("--card", layout.card);
    root.style.setProperty("--radius", `${layout.radius}px`);
  }, [layout]);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Aparência guardada. As alterações ficam visíveis para os visitantes.");
      } else {
        setMessage(data.error || "Erro ao guardar.");
      }
    } catch {
      setMessage("Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setLayout(defaults);
    setMessage("Valores predefinidos restaurados. Clica em Guardar para aplicar.");
  }

  const field = <K extends keyof LayoutSettings>(key: K) => ({
    value: layout[key] as any,
    onChange: (v: any) => setLayout((l) => ({ ...l, [key]: v })),
  });

  return (
    <main className="control-shell">
      <aside className="control-sidebar">
        <h1>lounge control</h1>
        <a className="pill" href="/lounge-atelier-772">Painel principal</a>
        <a className="pill" href="/lounge-atelier-772/pages">Páginas e políticas</a>
        <a className="pill" href="/" target="_blank" rel="noopener">Ver site</a>
      </aside>

      <section className="control-main">
        {message && <p className="control-message">{message}</p>}

        <div className="control-panel">
          <p className="eyebrow">aparência</p>
          <h2>Cores e estilo</h2>
          <p style={{ fontSize: ".85rem", color: "#74665f", marginBottom: "1.5rem" }}>
            As alterações aparecem instantaneamente nesta página como pré-visualização.
            Clica em <strong>Guardar</strong> para aplicar ao site.
          </p>

          <div className="form-grid">
            <ColorField label="Cor de fundo" {...field("background")} />
            <ColorField label="Cor do texto" {...field("text")} />
            <ColorField label="Cor secundária (muted)" {...field("muted")} />
            <ColorField label="Cor de destaque (accent)" {...field("accent")} />
            <ColorField label="Cor dos cards" {...field("card")} />

            <div className="wide">
              <RangeField label="Cantos arredondados" min={0} max={64} step={2} unit="px" {...field("radius")} />
            </div>
          </div>
        </div>

        <div className="control-panel">
          <p className="eyebrow">layout</p>
          <h2>Dimensões</h2>

          <div className="form-grid">
            <div className="wide">
              <RangeField label="Colunas na grelha de produtos" min={2} max={5} step={1} unit="" {...field("productGridColumns")} />
            </div>
            <div className="wide">
              <RangeField label="Altura dos cards de categoria" min={280} max={700} step={20} unit="px" {...field("categoryCardHeight")} />
            </div>
            <div className="wide">
              <RangeField label="Altura do hero (% do ecrã)" min={40} max={100} step={2} unit="%" {...field("heroHeight")} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: "0 0 2rem" }}>
          <button className="pill dark-pill" type="button" onClick={save} disabled={saving}>
            {saving ? "A guardar…" : "Guardar aparência"}
          </button>
          <button className="pill" type="button" onClick={reset}>
            Repor predefinições
          </button>
        </div>
      </section>
    </main>
  );
}
