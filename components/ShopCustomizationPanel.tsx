"use client";

import { useEffect, useState } from "react";

type CategoryForm = {
  originalId?: string;
  id: string;
  name: string;
  parentId: string;
  gender: string;
  mediaType: string;
  image: string;
  introTitle: string;
  introText: string;
  sortOrder: number;
  featured: boolean;
  styles: string;
};

const emptyCategory: CategoryForm = {
  originalId: "",
  id: "",
  name: "",
  parentId: "",
  gender: "unisex",
  mediaType: "image",
  image: "",
  introTitle: "",
  introText: "",
  sortOrder: 999,
  featured: true,
  styles: ""
};

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ShopCustomizationPanel() {
  const [categories, setCategories] = useState<any[]>([]);
  const [category, setCategory] = useState<CategoryForm>(emptyCategory);
  const [message, setMessage] = useState("");

  async function loadCategories() {
    const res = await fetch("/api/categories", { cache: "no-store" });

    if (!res.ok) {
      setMessage("Erro ao carregar categorias.");
      return;
    }

    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function updateField(key: keyof CategoryForm, value: string | boolean | number) {
    setCategory((current) => ({
      ...current,
      [key]: value
    }));
  }

  function autoIdFromName() {
    if (!category.name) {
      setMessage("Escreve primeiro o nome da categoria.");
      return;
    }

    setCategory((current) => ({
      ...current,
      id: slugify(current.name)
    }));
  }

  function editCategory(item: any) {
    setCategory({
      originalId: item.id || item.name || "",
      id: item.id || slugify(item.name || ""),
      name: item.name || "",
      parentId: item.parentId || "",
      gender: item.gender || "unisex",
      mediaType: item.mediaType || "image",
      image: item.image || "",
      introTitle: item.introTitle || "",
      introText: item.introText || "",
      sortOrder: Number(item.sortOrder || 999),
      featured: Boolean(item.featured),
      styles: Array.isArray(item.styles) ? item.styles.join(", ") : item.styles || ""
    });

    setMessage("Categoria carregada para edição. Podes mudar o ID e guardar.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveCategory() {
    const payload = {
      ...category,
      id: slugify(category.id || category.name),
      originalId: category.originalId || "",
      styles: category.styles
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    };

    if (!payload.id || !payload.name) {
      setMessage("A categoria precisa de ID e nome.");
      return;
    }

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error || "Erro ao guardar categoria.");
      return;
    }

    setMessage("Categoria guardada/atualizada.");
    setCategory(emptyCategory);
    await loadCategories();
  }

  async function deleteCategory(item: any) {
    const id = item.id || slugify(item.name || "");

    if (!id) {
      setMessage("Esta categoria não tem ID nem nome válido para apagar.");
      return;
    }

    const confirmDelete = window.confirm(`Apagar a categoria "${item.name || id}"?`);
    if (!confirmDelete) return;

    const res = await fetch("/api/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id,
        name: item.name || ""
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error || "Erro ao apagar categoria.");
      return;
    }

    setMessage("Categoria apagada.");
    await loadCategories();
  }

  return (
    <main className="control-shell">
      <aside className="control-sidebar">
        <h1>lounge control</h1>
        <a className="pill" href="/lounge-atelier-772">Painel principal</a>
        <a className="pill" href="/lounge-atelier-772/images">Imagens do site</a>
        <a className="pill" href="/">Ver site</a>
      </aside>

      <section className="control-main">
        {message ? <p className="control-message">{message}</p> : null}

        <div className="control-panel">
          <p className="eyebrow">collections</p>
          <h2>Categorias</h2>

          <div className="form-grid">
            <label>
              ID
              <input
                value={category.id}
                onChange={(event) => updateField("id", slugify(event.target.value))}
                placeholder="ex: summer-dresses"
              />
            </label>

            <label>
              Nome da categoria
              <input
                value={category.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="ex: Summer Dresses"
              />
            </label>

            <button className="pill" type="button" onClick={autoIdFromName}>
              Criar ID pelo nome
            </button>

            <label>
              Género
              <select
                value={category.gender}
                onChange={(event) => updateField("gender", event.target.value)}
              >
                <option value="women">women</option>
                <option value="men">men</option>
                <option value="unisex">unisex</option>
              </select>
            </label>

            <label>
              Categoria-mãe (para criar uma subcategoria)
              <select
                value={category.parentId}
                onChange={(event) => updateField("parentId", event.target.value)}
              >
                <option value="">— nenhuma (categoria de topo) —</option>
                {categories
                  .filter((item) => !item.parentId)
                  .filter((item) => item.id !== category.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Tipo media
              <select
                value={category.mediaType}
                onChange={(event) => updateField("mediaType", event.target.value)}
              >
                <option value="image">image</option>
                <option value="video">video</option>
              </select>
            </label>

            <label>
              Ordem
              <input
                type="number"
                value={category.sortOrder}
                onChange={(event) => updateField("sortOrder", Number(event.target.value))}
              />
            </label>

            <label>
              Imagem/vídeo da categoria
              <input
                value={category.image}
                onChange={(event) => updateField("image", event.target.value)}
                placeholder="https://..."
              />
            </label>

            <label>
              Título de introdução
              <input
                value={category.introTitle}
                onChange={(event) => updateField("introTitle", event.target.value)}
              />
            </label>

            <label className="wide">
              Texto de introdução
              <textarea
                value={category.introText}
                onChange={(event) => updateField("introText", event.target.value)}
              />
            </label>

            <label className="wide">
              Estilos separados por vírgula
              <input
                value={category.styles}
                onChange={(event) => updateField("styles", event.target.value)}
                placeholder="classic, casual, beach"
              />
            </label>

            <label>
              Mostrar na página inicial
              <select
                value={category.featured ? "yes" : "no"}
                onChange={(event) => updateField("featured", event.target.value === "yes")}
              >
                <option value="yes">sim</option>
                <option value="no">não</option>
              </select>
            </label>
          </div>

          <button className="pill dark-pill wide" type="button" onClick={saveCategory}>
            Guardar categoria
          </button>

          <button
            className="pill wide"
            type="button"
            onClick={() => {
              setCategory(emptyCategory);
              setMessage("Nova categoria.");
            }}
          >
            Nova categoria
          </button>
        </div>

        <div className="control-panel">
          <p className="eyebrow">lista</p>
          <h2>Categorias existentes</h2>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Género</th>
                  <th>Ordem</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((item) => (
                  <tr key={`${item.id}-${item.name}`}>
                    <td>{item.id || "sem-id"}</td>
                    <td>{item.name}</td>
                    <td>{item.gender || "unisex"}</td>
                    <td>{item.sortOrder || 999}</td>
                    <td>
                      <button className="pill" type="button" onClick={() => editCategory(item)}>
                        Editar
                      </button>

                      <button className="pill" type="button" onClick={() => deleteCategory(item)}>
                        Apagar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

