"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Product, Category } from "@/types";

type Tab =
  | "overview"
  | "home"
  | "products"
  | "categories"
  | "suppliers"
  | "payments"
  | "orders";

type MediaType = "image" | "video";
type Gender = "women" | "men" | "unisex";
type ProductStatus = "active" | "draft" | "archived";
type ProviderName = "printful" | "printify";
type PaymentProviderName = "stripe" | "paypal";

type IntegrationSettings = {
  enabled: boolean;
  useAsProductSource: boolean;
  apiToken: string;
  storeId?: string;
  shopId?: string;
};

type PaymentSettings = {
  stripeEnabled: boolean;
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  paypalEnabled: boolean;
  paypalClientId: string;
  paypalClientSecret: string;
  paypalMode: "sandbox" | "live";
};

type HomeSettings = {
  heroTitle: string;
  heroText: string;
  heroMediaUrl: string;
  heroMediaType: MediaType;
  newnessMediaUrl: string;
  newnessMediaType: MediaType;
};

type Settings = {
  home: HomeSettings;
  integrations: {
    printful: IntegrationSettings;
    printify: IntegrationSettings;
  };
  payments: PaymentSettings;
};

type Order = {
  id: string;
  customerEmail: string;
  status: string;
  total: number;
  paymentProvider: string;
};

type CategoryFormModel = Category & {
  sortOrder?: number;
  showInMen?: boolean;
  showInWomen?: boolean;
};

const emptyProduct: Product = {
  id: "",
  slug: "",
  title: "",
  categoryId: "",
  categoryIds: [],
  category: "",
  collection: "",
  gender: "women",
  style: "",
  price: 0,
  compareAt: 0,
  stock: 0,
  source: "manual",
  status: "active",
  image: "",
  mediaType: "image",
  gallery: [],
  description: "",
  details: [],
  colors: [],
  sizes: [],
  tags: [],
  provider: "manual"
};

const emptyCategory: CategoryFormModel = {
  id: "",
  name: "",
  gender: "unisex",
  image: "",
  mediaType: "image",
  featured: true,
  styles: [],
  sortOrder: 1,
  showInMen: true,
  showInWomen: true
};

const defaultSettings: Settings = {
  home: {
    heroTitle: "",
    heroText: "",
    heroMediaUrl: "",
    heroMediaType: "image",
    newnessMediaUrl: "",
    newnessMediaType: "image"
  },
  integrations: {
    printful: {
      enabled: false,
      useAsProductSource: false,
      apiToken: "",
      storeId: ""
    },
    printify: {
      enabled: false,
      useAsProductSource: false,
      apiToken: "",
      shopId: ""
    }
  },
  payments: {
    stripeEnabled: false,
    stripePublishableKey: "",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    paypalEnabled: false,
    paypalClientId: "",
    paypalClientSecret: "",
    paypalMode: "sandbox"
  }
};

function makeSlug(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado.") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = await parseJsonSafe<T & { error?: string; message?: string }>(response);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Pedido falhou.");
  }

  return (data as T) ?? ({} as T);
}

function normalizeCategory(category: Category): CategoryFormModel {
  return {
    ...category,
    sortOrder: (category as CategoryFormModel).sortOrder ?? 1,
    showInMen: (category as CategoryFormModel).showInMen ?? true,
    showInWomen: (category as CategoryFormModel).showInWomen ?? true
  };
}

export default function ControlPanel() {
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [message, setMessage] = useState("");

  const [settings, setSettings] = useState<Settings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryFormModel[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const messageRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) {
      messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [message]);

  const [productForm, setProductForm] = useState<Product>(emptyProduct);
  const [categoryForm, setCategoryForm] = useState<CategoryFormModel>(emptyCategory);
  const [storageStatus, setStorageStatus] = useState<Record<string, any> | null>(null);

  const checkStorageStatus = useCallback(async () => {
    setStorageStatus(null);
    try {
      const res = await fetch("/api/admin/status", { cache: "no-store" });
      const data = await res.json();
      setStorageStatus(data);
    } catch {
      setStorageStatus({ error: "Não foi possível contactar o servidor." });
    }
  }, []);

  const stats = useMemo(
    () => ({
      products: products.length,
      categories: categories.length,
      orders: orders.length,
      stock: products.reduce((sum, product) => sum + Number(product.stock || 0), 0)
    }),
    [products, categories, orders]
  );

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);

      const [settingsRes, productsRes, categoriesRes, ordersRes] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }),
        fetch(`/api/products?t=${Date.now()}`, { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/orders", { cache: "no-store" })
      ]);

      const settingsData = settingsRes.ok
        ? await parseJsonSafe<Settings>(settingsRes)
        : null;

      const productsData = productsRes.ok
        ? await parseJsonSafe<Product[]>(productsRes)
        : [];

      const categoriesData = categoriesRes.ok
        ? await parseJsonSafe<Category[]>(categoriesRes)
        : [];

      const ordersData = ordersRes.ok
        ? await parseJsonSafe<Order[]>(ordersRes)
        : [];

      setSettings(settingsData ?? defaultSettings);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(
        Array.isArray(categoriesData)
          ? categoriesData.map(normalizeCategory)
          : []
      );
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      setMessage(getErrorMessage(error, "Erro ao carregar dados do painel."));
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      try {
        setSubmitting(true);
        setMessage("");

        await requestJson("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });

        setAuth(true);
        await loadAll();
      } catch (error) {
        setMessage(getErrorMessage(error, "Login incorreto."));
      } finally {
        setSubmitting(false);
      }
    },
    [username, password, loadAll]
  );

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      if (!settings) return;

      try {
        setSubmitting(true);
        setMessage("");

        const data = await requestJson<Settings>("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });

        setSettings(data);
        setMessage("Definições guardadas.");
      } catch (error) {
        setMessage(getErrorMessage(error, "Erro ao guardar definições."));
      } finally {
        setSubmitting(false);
      }
    },
    [settings]
  );

  function toggleProductCategory(category: any, checked: boolean) {
    setProductForm((current: any) => {
      let ids: string[] = [...(current.categoryIds || [])];

      if (checked) {
        if (!ids.includes(category.id)) ids.push(category.id);
        // subcategoria arrasta a categoria-mãe
        if (category.parentId && !ids.includes(category.parentId)) ids.push(category.parentId);
      } else {
        ids = ids.filter((id) => id !== category.id);
      }

      const primary = ids[0] || "";
      const primaryCategory = categories.find((item: any) => item.id === primary);

      return {
        ...current,
        categoryIds: ids,
        categoryId: primary,
        category: primaryCategory?.name || current.category
      };
    });
  }

  const saveProduct = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      try {
        setSubmitting(true);
        setMessage("");

        const isRemote =
          productForm.id.startsWith("printful-") ||
          productForm.id.startsWith("printify-") ||
          productForm.source === "printful" ||
          productForm.source === "printify";

        if (isRemote) {
          const data = await requestJson<Product>("/api/product-overrides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: productForm.id,
              override: productForm
            })
          });

          setProducts((old) => {
            const index = old.findIndex((p) => p.id === data.id);

            if (index >= 0) {
              const copy = [...old];
              copy[index] = data;
              return copy;
            }

            return [data, ...old];
          });

          setProductForm(emptyProduct);
          setMessage("Produto remoto guardado.");
          return;
        }

        const payload: Product = {
          ...productForm,
          id: productForm.id || crypto.randomUUID(),
          slug: productForm.slug || makeSlug(productForm.title),
          categoryId: productForm.categoryId || makeSlug(productForm.category),
          collection: productForm.collection || makeSlug(productForm.category),
          price: Number(productForm.price || 0),
          compareAt: Number(productForm.compareAt || 0),
          stock: Number(productForm.stock || 0),
          categoryIds: Array.from(
            new Set(
              [
                productForm.categoryId || makeSlug(productForm.category),
                ...(productForm.categoryIds || [])
              ].filter(Boolean)
            )
          )
        };

        await requestJson<Product>("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        setProductForm(emptyProduct);
        setMessage("Produto guardado.");
        await loadAll();
      } catch (error) {
        setMessage(getErrorMessage(error, "Erro ao guardar produto."));
      } finally {
        setSubmitting(false);
      }
    },
    [productForm, loadAll]
  );

  const editProduct = useCallback((product: Product) => {
    setProductForm(product);
    setTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    if (!window.confirm("Apagar ou ocultar este produto?")) return;

    try {
      setSubmitting(true);
      setMessage("");

      const response = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      const data = await parseJsonSafe<{ hidden?: boolean; error?: string }>(response);

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao apagar produto.");
      }

      setProducts((old) => old.filter((p) => p.id !== id));
      setMessage(data?.hidden ? "Produto de fornecedor ocultado." : "Produto apagado.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Erro ao apagar produto."));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const saveCategory = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      try {
        setSubmitting(true);
        setMessage("");

        const payload: CategoryFormModel = {
          ...categoryForm,
          id: categoryForm.id || makeSlug(categoryForm.name),
          sortOrder: Number(categoryForm.sortOrder || 1),
          showInMen: categoryForm.showInMen ?? true,
          showInWomen: categoryForm.showInWomen ?? true
        };

        const data = await requestJson<CategoryFormModel>("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        setCategories((old) => {
          const index = old.findIndex((c) => c.id === data.id);

          if (index >= 0) {
            const copy = [...old];
            copy[index] = normalizeCategory(data);
            return copy;
          }

          return [...old, normalizeCategory(data)];
        });

        setCategoryForm(emptyCategory);
        setMessage("Categoria guardada.");
      } catch (error) {
        setMessage(getErrorMessage(error, "Erro ao guardar categoria."));
      } finally {
        setSubmitting(false);
      }
    },
    [categoryForm]
  );

  const editCategory = useCallback((category: CategoryFormModel) => {
    setCategoryForm(normalizeCategory(category));
    setTab("categories");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    if (!window.confirm("Apagar esta categoria?")) return;

    try {
      setSubmitting(true);
      setMessage("");

      const response = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include"
      });

      const data = await parseJsonSafe<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao apagar categoria.");
      }

      setCategories((old) => old.filter((c) => c.id !== id));
      setMessage("Categoria apagada.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Erro ao apagar categoria."));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const testConnection = useCallback(async (provider: ProviderName) => {
    try {
      setSubmitting(true);
      setMessage(`A testar ${provider}...`);

      const data = await requestJson<{ message?: string }>(
        `/api/integrations/${provider}/test`,
        { method: "POST" }
      );

      setMessage(data.message || "Teste concluído.");
    } catch (error) {
      setMessage(getErrorMessage(error, `Erro ao testar ${provider}.`));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const syncProvider = useCallback(
    async (provider: ProviderName) => {
      try {
        setSubmitting(true);
        setMessage(`A sincronizar ${provider}...`);

        const data = await requestJson<{ message?: string }>(
          `/api/integrations/${provider}/sync`,
          { method: "POST" }
        );

        setMessage(data.message || "Sincronização concluída.");
        await loadAll();
      } catch (error) {
        setMessage(getErrorMessage(error, `Erro ao sincronizar ${provider}.`));
      } finally {
        setSubmitting(false);
      }
    },
    [loadAll]
  );

  const testPayment = useCallback(async (provider: PaymentProviderName) => {
    try {
      setSubmitting(true);
      setMessage(`A testar ${provider}...`);

      const data = await requestJson<{ message?: string }>(
        `/api/payments/${provider}/test`,
        { method: "POST" }
      );

      setMessage(data.message || "Teste concluído.");
    } catch (error) {
      setMessage(getErrorMessage(error, `Erro ao testar ${provider}.`));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await fetch("/api/auth/me");

        if (!res.ok) {
          setLoading(false);
          return;
        }

        setAuth(true);
        await loadAll();
      } catch {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [loadAll]);

  if (!auth && !loading) {
    return (
      <main className="control-login">
        <form className="login-card" onSubmit={login}>
          <h1>lounge control</h1>
          <p>Entra para gerir o site.</p>

          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Utilizador"
            autoComplete="username"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />

          <button className="pill dark-pill" disabled={submitting}>
            {submitting ? "A entrar..." : "Entrar"}
          </button>

          {message && <p>{message}</p>}
        </form>
      </main>
    );
  }

  if (loading || !settings) {
    return <main className="control-login">A carregar...</main>;
  }

  const { printful, printify } = settings.integrations;
  const payments = settings.payments;

  return (
    <main className="control-shell">
      <aside className="control-sidebar">
        <h1>lounge control</h1>

        <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
          Visão geral
        </button>
        <button type="button" className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}>
          Página inicial
        </button>
        <button type="button" className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>
          Produtos
        </button>
        <button type="button" className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>
          Categorias
        </button>
        <button type="button" className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>
          Fornecedores
        </button>
        <button type="button" className={tab === "payments" ? "active" : ""} onClick={() => setTab("payments")}>
          Pagamentos
        </button>
        <button type="button" className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
          Encomendas
        </button>

        <a className="pill" href="/lounge-atelier-772/shop-customization">
          Personalizar loja
        </a>
        <a className="pill" href="/lounge-atelier-772/pages">
          Páginas e políticas
        </a>
        <a className="pill" href="/">
          Ver site
        </a>
        <button className="pill" type="button" onClick={logout}>
          Sair
        </button>
      </aside>

      <section className="control-main">
        {message && <p ref={messageRef} className="control-message">{message}</p>}

        {tab === "overview" && (
          <Panel title="Visão geral" eyebrow="dashboard">
            <div className="stat-grid">
              <StatCard label="Produtos" value={stats.products} />
              <StatCard label="Categorias" value={stats.categories} />
              <StatCard label="Stock" value={stats.stock} />
              <StatCard label="Encomendas" value={stats.orders} />
            </div>

            <div className="form-grid" style={{ marginTop: "2rem" }}>
              <div className="field">
                <span className="field-label">Base de dados</span>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="pill"
                    onClick={checkStorageStatus}
                  >
                    Testar ligação
                  </button>
                  {storageStatus && (
                    <button
                      type="button"
                      className="pill"
                      onClick={async () => {
                        if (!window.confirm("Inicializar Supabase com os dados locais?")) return;
                        try {
                          const res = await fetch("/api/admin/seed-supabase", { method: "POST" });
                          const data = await res.json();
                          setMessage(data.error || data.message || "Supabase inicializado.");
                          await checkStorageStatus();
                        } catch {
                          setMessage("Erro ao inicializar Supabase.");
                        }
                      }}
                    >
                      Inicializar Supabase
                    </button>
                  )}
                </div>

                {storageStatus && (
                  <pre style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem 1rem",
                    background: storageStatus.error || !storageStatus.supabaseConfigured || storageStatus.supabaseReadable === false
                      ? "#fff0f0"
                      : "#f0fff4",
                    border: "1px solid",
                    borderColor: storageStatus.error || !storageStatus.supabaseConfigured || storageStatus.supabaseReadable === false
                      ? "#ffcccc"
                      : "#b2f5c8",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}>
                    {!storageStatus.supabaseConfigured
                      ? "❌ Supabase NÃO configurado\n\nAdiciona na Vercel (Settings → Environment Variables):\n• NEXT_PUBLIC_SUPABASE_URL\n• SUPABASE_SERVICE_ROLE_KEY\n\nDepois faz redeploy."
                      : storageStatus.supabaseReadable === false
                        ? `❌ Supabase configurado mas com erro:\n${storageStatus.supabaseError || storageStatus.storeError}\n\nVerifica se a tabela 'lounge_store' existe no Supabase.\nCorre o ficheiro supabase/schema.sql no SQL Editor do Supabase.`
                        : `✅ Supabase OK\n• Linhas na BD: ${storageStatus.supabaseRows ?? "?"}\n• Chaves: ${(storageStatus.supabaseKeys ?? []).join(", ") || "(nenhuma — clica Inicializar Supabase)"}\n• Produtos na BD: ${storageStatus.productsCount ?? "?"}`
                    }
                  </pre>
                )}
              </div>
            </div>
          </Panel>
        )}

        {tab === "home" && (
          <Panel title="Página inicial" eyebrow="homepage">
            <div className="form-grid">
              <TextField
                label="Hero título"
                value={settings.home.heroTitle}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    home: { ...settings.home, heroTitle: value }
                  })
                }
              />

              <TextField
                label="Hero texto"
                value={settings.home.heroText}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    home: { ...settings.home, heroText: value }
                  })
                }
              />

              <TextField
                label="Hero imagem/vídeo"
                value={settings.home.heroMediaUrl}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    home: { ...settings.home, heroMediaUrl: value }
                  })
                }
              />

              <SelectField
                label="Tipo hero"
                value={settings.home.heroMediaType}
                options={["image", "video"]}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    home: {
                      ...settings.home,
                      heroMediaType: value as MediaType
                    }
                  })
                }
              />

              <TextField
                label="Novidades imagem/vídeo"
                value={settings.home.newnessMediaUrl}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    home: { ...settings.home, newnessMediaUrl: value }
                  })
                }
              />

              <SelectField
                label="Tipo novidades"
                value={settings.home.newnessMediaType}
                options={["image", "video"]}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    home: {
                      ...settings.home,
                      newnessMediaType: value as MediaType
                    }
                  })
                }
              />

              <SectionActions>
                <button
                  className="pill dark-pill"
                  type="button"
                  disabled={submitting}
                  onClick={() => saveSettings({ home: settings.home })}
                >
                  Guardar página inicial
                </button>
              </SectionActions>
            </div>
          </Panel>
        )}

        {tab === "products" && (
          <Panel title="Produtos" eyebrow="inventory">
            <form onSubmit={saveProduct} className="form-grid">
              <TextField
                label="Título"
                value={productForm.title}
                onChange={(value) => setProductForm({ ...productForm, title: value })}
              />

              {/* Categorias e subcategorias — um produto pode ter várias */}
              <div className="field">
                <span className="field-label">Categorias e subcategorias</span>
                <div className="category-picker">
                  {categories
                    .filter((item: any) => !item.parentId)
                    .map((parentCategory: any) => (
                      <div key={parentCategory.id} className="category-picker-group">
                        <label className="category-picker-item category-picker-parent">
                          <input
                            type="checkbox"
                            checked={(productForm.categoryIds ?? []).includes(parentCategory.id)}
                            onChange={(event) => toggleProductCategory(parentCategory, event.target.checked)}
                          />
                          {parentCategory.name}
                        </label>
                        {categories
                          .filter((sub: any) => sub.parentId === parentCategory.id)
                          .map((sub: any) => (
                            <label key={sub.id} className="category-picker-item category-picker-child">
                              <input
                                type="checkbox"
                                checked={(productForm.categoryIds ?? []).includes(sub.id)}
                                onChange={(event) => toggleProductCategory(sub, event.target.checked)}
                              />
                              {sub.name}
                            </label>
                          ))}
                      </div>
                    ))}
                </div>
                <span className="muted small">
                  Marca todas as que se aplicam. Ao marcar uma subcategoria, a
                  categoria-mãe é incluída automaticamente.
                </span>
              </div>

              <TextField
                label="Estilo"
                value={productForm.style}
                onChange={(value) => setProductForm({ ...productForm, style: value })}
              />

              <SelectField
                label="Género"
                value={productForm.gender}
                options={["women", "men", "unisex"]}
                onChange={(value) =>
                  setProductForm({ ...productForm, gender: value as Gender })
                }
              />

              <SelectField
                label="Estado"
                value={productForm.status}
                options={["active", "draft", "archived"]}
                onChange={(value) =>
                  setProductForm({
                    ...productForm,
                    status: value as ProductStatus
                  })
                }
              />

              <TextField
                label="Preço"
                type="number"
                value={productForm.price}
                onChange={(value) =>
                  setProductForm({ ...productForm, price: Number(value) })
                }
              />

              <TextField
                label="Preço antigo"
                type="number"
                value={productForm.compareAt || 0}
                onChange={(value) =>
                  setProductForm({ ...productForm, compareAt: Number(value) })
                }
              />

              <TextField
                label="Stock"
                type="number"
                value={productForm.stock}
                onChange={(value) =>
                  setProductForm({ ...productForm, stock: Number(value) })
                }
              />

              <TextField
                label="Imagem principal"
                value={productForm.image}
                onChange={(value) => setProductForm({ ...productForm, image: value })}
              />

              <TextField
                label="Galeria (URLs separadas por vírgula)"
                value={productForm.gallery.join(", ")}
                onChange={(value) =>
                  setProductForm({
                    ...productForm,
                    gallery: value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  })
                }
              />

              <TextField
                label="Tamanhos (separados por vírgula)"
                value={productForm.sizes.join(", ")}
                onChange={(value) =>
                  setProductForm({
                    ...productForm,
                    sizes: value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  })
                }
              />

              <TextAreaField
                label="Descrição"
                value={productForm.description}
                onChange={(value) =>
                  setProductForm({ ...productForm, description: value })
                }
              />

              <SectionActions>
                <button className="pill dark-pill" disabled={submitting}>
                  {productForm.id ? "Guardar alterações" : "Guardar produto"}
                </button>
              </SectionActions>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Fornecedor</th>
                    <th>Categoria</th>
                    <th>Preço</th>
                    <th>Stock</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.title}</td>
                      <td>{product.provider || product.source}</td>
                      <td>{product.category}</td>
                      <td>{product.price} EUR</td>
                      <td>{product.stock}</td>
                      <td>
                        <div className="inline-actions">
                          <button
                            className="pill"
                            type="button"
                            onClick={() => editProduct(product)}
                          >
                            Editar
                          </button>

                          <button
                            className="pill"
                            type="button"
                            onClick={() => deleteProduct(product.id)}
                          >
                            Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === "categories" && (
          <Panel title="Categorias" eyebrow="collections">
            <form onSubmit={saveCategory} className="form-grid">
              <TextField
                label="ID"
                value={categoryForm.id}
                onChange={(value) => setCategoryForm({ ...categoryForm, id: value })}
              />

              <TextField
                label="Nome"
                value={categoryForm.name}
                onChange={(value) => setCategoryForm({ ...categoryForm, name: value })}
              />

              <SelectField
                label="Género"
                value={categoryForm.gender}
                options={["women", "men", "unisex"]}
                onChange={(value) =>
                  setCategoryForm({ ...categoryForm, gender: value as Gender })
                }
              />

              <TextField
                label="Imagem/vídeo da categoria"
                value={categoryForm.image}
                onChange={(value) => setCategoryForm({ ...categoryForm, image: value })}
              />

              <SelectField
                label="Tipo media"
                value={categoryForm.mediaType}
                options={["image", "video"]}
                onChange={(value) =>
                  setCategoryForm({
                    ...categoryForm,
                    mediaType: value as MediaType
                  })
                }
              />

              <TextField
                label="Ordem na página inicial"
                type="number"
                value={categoryForm.sortOrder || 1}
                onChange={(value) =>
                  setCategoryForm({
                    ...categoryForm,
                    sortOrder: Number(value || 1)
                  })
                }
              />

              <TextField
                label="Estilos separados por vírgula"
                value={categoryForm.styles.join(", ")}
                onChange={(value) =>
                  setCategoryForm({
                    ...categoryForm,
                    styles: value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  })
                }
              />

              <SelectField
                label="Mostrar na homepage"
                value={categoryForm.featured ? "yes" : "no"}
                options={["yes", "no"]}
                onChange={(value) =>
                  setCategoryForm({
                    ...categoryForm,
                    featured: value === "yes"
                  })
                }
              />

              <SelectField
                label="Mostrar na aba Men"
                value={categoryForm.showInMen ? "yes" : "no"}
                options={["yes", "no"]}
                onChange={(value) =>
                  setCategoryForm({
                    ...categoryForm,
                    showInMen: value === "yes"
                  })
                }
              />

              <SelectField
                label="Mostrar na aba Women"
                value={categoryForm.showInWomen ? "yes" : "no"}
                options={["yes", "no"]}
                onChange={(value) =>
                  setCategoryForm({
                    ...categoryForm,
                    showInWomen: value === "yes"
                  })
                }
              />

              <SectionActions>
                <button className="pill dark-pill" disabled={submitting}>
                  {categoryForm.id ? "Guardar categoria" : "Criar categoria"}
                </button>
              </SectionActions>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Género</th>
                    <th>Estilos</th>
                    <th>Homepage</th>
                    <th>Aba Men</th>
                    <th>Aba Women</th>
                    <th>Ordem</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.id}</td>
                      <td>{category.name}</td>
                      <td>{category.gender}</td>
                      <td>{category.styles.join(", ")}</td>
                      <td>{category.featured ? "Sim" : "Não"}</td>
                      <td>{category.showInMen ? "Sim" : "Não"}</td>
                      <td>{category.showInWomen ? "Sim" : "Não"}</td>
                      <td>{category.sortOrder || 999}</td>
                      <td>
                        <div className="inline-actions">
                          <button
                            className="pill"
                            type="button"
                            onClick={() => editCategory(category)}
                          >
                            Editar
                          </button>

                          <button
                            className="pill"
                            type="button"
                            onClick={() => deleteCategory(category.id)}
                          >
                            Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === "suppliers" && (
          <Panel title="Fornecedores" eyebrow="connections">
            <div className="form-grid">
              <h3 className="wide">Printful</h3>

              <SelectField
                label="Ativar Printful"
                value={printful.enabled ? "yes" : "no"}
                options={["yes", "no"]}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      printful: {
                        ...printful,
                        enabled: value === "yes"
                      }
                    }
                  })
                }
              />

              <SelectField
                label="Usar produtos Printful"
                value={printful.useAsProductSource ? "yes" : "no"}
                options={["yes", "no"]}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      printful: {
                        ...printful,
                        useAsProductSource: value === "yes"
                      }
                    }
                  })
                }
              />

              <TextField
                label="Printful API Token"
                value={printful.apiToken}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      printful: {
                        ...printful,
                        apiToken: value
                      }
                    }
                  })
                }
              />

              <TextField
                label="Printful Store ID"
                value={printful.storeId || ""}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      printful: {
                        ...printful,
                        storeId: value
                      }
                    }
                  })
                }
              />

              <SectionActions>
                <button className="pill" type="button" onClick={() => testConnection("printful")}>
                  Testar Printful
                </button>
                <button className="pill" type="button" onClick={() => syncProvider("printful")}>
                  Sincronizar Printful
                </button>
              </SectionActions>

              <h3 className="wide">Printify</h3>

              <SelectField
                label="Ativar Printify"
                value={printify.enabled ? "yes" : "no"}
                options={["yes", "no"]}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      printify: {
                        ...printify,
                        enabled: value === "yes"
                      }
                    }
                  })
                }
              />

              <SelectField
                label="Usar produtos Printify"
                value={printify.useAsProductSource ? "yes" : "no"}
                options={["yes", "no"]}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      printify: {
                        ...printify,
                        useAsProductSource: value === "yes"
                      }
                    }
                  })
                }
              />

              <TextField
                label="Printify API Token"
                value={printify.apiToken}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      printify: {
                        ...printify,
                        apiToken: value
                      }
                    }
                  })
                }
              />

              <TextField
                label="Printify Shop ID"
                value={printify.shopId || ""}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      printify: {
                        ...printify,
                        shopId: value
                      }
                    }
                  })
                }
              />

              <SectionActions>
                <button className="pill" type="button" onClick={() => testConnection("printify")}>
                  Testar Printify
                </button>
                <button className="pill" type="button" onClick={() => syncProvider("printify")}>
                  Sincronizar Printify
                </button>
              </SectionActions>

              <SectionActions>
                <button
                  className="pill dark-pill"
                  type="button"
                  disabled={submitting}
                  onClick={() => saveSettings({ integrations: settings.integrations })}
                >
                  Guardar fornecedores
                </button>
              </SectionActions>
            </div>
          </Panel>
        )}

        {tab === "payments" && (
          <Panel title="Pagamentos" eyebrow="checkout">
            <div className="form-grid">
              <SelectField
                label="Ativar Stripe"
                value={payments.stripeEnabled ? "yes" : "no"}
                options={["yes", "no"]}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    payments: {
                      ...payments,
                      stripeEnabled: value === "yes"
                    }
                  })
                }
              />

              <TextField
                label="Stripe Publishable Key"
                value={payments.stripePublishableKey}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    payments: {
                      ...payments,
                      stripePublishableKey: value
                    }
                  })
                }
              />

              <TextField
                label="Stripe Secret Key"
                value={payments.stripeSecretKey}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    payments: {
                      ...payments,
                      stripeSecretKey: value
                    }
                  })
                }
              />

              <TextField
                label="Stripe Webhook Secret"
                value={payments.stripeWebhookSecret}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    payments: {
                      ...payments,
                      stripeWebhookSecret: value
                    }
                  })
                }
              />

              <button className="pill" type="button" onClick={() => testPayment("stripe")}>
                Testar Stripe
              </button>

              <SelectField
                label="Ativar PayPal"
                value={payments.paypalEnabled ? "yes" : "no"}
                options={["yes", "no"]}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    payments: {
                      ...payments,
                      paypalEnabled: value === "yes"
                    }
                  })
                }
              />

              <TextField
                label="PayPal Client ID"
                value={payments.paypalClientId}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    payments: {
                      ...payments,
                      paypalClientId: value
                    }
                  })
                }
              />

              <TextField
                label="PayPal Client Secret"
                value={payments.paypalClientSecret}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    payments: {
                      ...payments,
                      paypalClientSecret: value
                    }
                  })
                }
              />

              <SelectField
                label="Modo PayPal"
                value={payments.paypalMode}
                options={["sandbox", "live"]}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    payments: {
                      ...payments,
                      paypalMode: value as "sandbox" | "live"
                    }
                  })
                }
              />

              <button className="pill" type="button" onClick={() => testPayment("paypal")}>
                Testar PayPal
              </button>

              <SectionActions>
                <button
                  className="pill dark-pill"
                  type="button"
                  disabled={submitting}
                  onClick={() => saveSettings({ payments: settings.payments })}
                >
                  Guardar pagamentos
                </button>
              </SectionActions>
            </div>
          </Panel>
        )}

        {tab === "orders" && (
          <Panel title="Encomendas" eyebrow="orders">
            <button className="pill" type="button" onClick={loadAll}>
              Atualizar encomendas
            </button>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.customerEmail}</td>
                      <td>{order.status}</td>
                      <td>{order.total} EUR</td>
                      <td>{order.paymentProvider}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </section>
    </main>
  );
}

type PanelProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
};

function Panel({ title, eyebrow, children }: PanelProps) {
  return (
    <div className="control-panel">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number | string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number" | "password";
  className?: string;
};

function TextField({
  label,
  value,
  onChange,
  type = "text",
  className
}: TextFieldProps) {
  return (
    <label className={className}>
      {label}
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type SelectFieldProps<T extends string> = {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  className?: string;
};

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  className
}: SelectFieldProps<T>) {
  return (
    <label className={className}>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function TextAreaField({
  label,
  value,
  onChange,
  className = "wide"
}: TextAreaFieldProps) {
  return (
    <label className={className}>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

type SectionActionsProps = {
  children: ReactNode;
};

function SectionActions({ children }: SectionActionsProps) {
  return <div className="wide inline-actions">{children}</div>;
}

