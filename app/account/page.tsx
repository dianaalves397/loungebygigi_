"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabaseBrowser";

type OrderItem = {
  title: string;
  quantity: number;
  size?: string;
  color?: string;
  price?: number;
  variant?: string;
};

type AccountOrder = {
  id: string;
  status: string;
  customerEmail: string;
  total: number;
  currency: string;
  paymentProvider: string;
  paymentStatus: string;
  createdAt: string;
  receiptSent: boolean;
  items: OrderItem[];
};

type CustomerProfile = {
  email: string;
  name: string;
  phone: string;
  addresses: any[];
  createdAt?: string;
};

const emptyAddress = {
  line1: "",
  line2: "",
  city: "",
  postalCode: "",
  country: "Portugal"
};

function statusLabel(status: string) {
  const value = String(status || "").toLowerCase();

  if (value.includes("paid")) return "Pago";
  if (value.includes("complete")) return "Concluído";
  if (value.includes("failed")) return "Falhou";
  if (value.includes("cancel")) return "Cancelado";
  if (value.includes("fulfill")) return "Em produção";
  if (value.includes("ship")) return "Enviado";

  return "Pendente";
}

export default function AccountPage() {
  const [supabaseReady, setSupabaseReady] = useState(true);
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [session, setSession] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [profile, setProfile] = useState<CustomerProfile>({
    email: "",
    name: "",
    phone: "",
    addresses: [emptyAddress]
  });
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function getSupabase() {
    try {
      return createBrowserSupabaseClient();
    } catch {
      setSupabaseReady(false);
      return null;
    }
  }

  async function initialize() {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data } = await supabase.auth.getSession();

    setSession(data.session);

    if (data.session) {
      await loadAccount(data.session.access_token);
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);

      if (nextSession) {
        await loadAccount(nextSession.access_token);
      } else {
        setOrders([]);
        setProfile({
          email: "",
          name: "",
          phone: "",
          addresses: [emptyAddress]
        });
      }
    });

    return () => listener.subscription.unsubscribe();
  }

  useEffect(() => {
    initialize();
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();

    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSession(data.session);
    setMessage("Sessão iniciada.");

    if (data.session) {
      await loadAccount(data.session.access_token);
    }
  }

  async function register(event: React.FormEvent) {
    event.preventDefault();

    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: {
        data: {
          name: authName
        },
        emailRedirectTo: `${window.location.origin}/account`
      }
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      setSession(data.session);
      setMessage("Conta criada.");
      await loadAccount(data.session.access_token);
    } else {
      setMessage("Conta criada. Confirma o email antes de entrar.");
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();

    const supabase = getSupabase();
    if (!supabase) return;

    if (!authEmail) {
      setMessage("Escreve o teu email primeiro.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: `${window.location.origin}/account`
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Email de recuperação enviado.");
  }

  async function logout() {
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase.auth.signOut();
    setSession(null);
    setOrders([]);
    setMessage("Sessão terminada.");
  }

  async function loadAccount(token: string) {
    setLoading(true);

    const [ordersRes, profileRes] = await Promise.all([
      fetch("/api/account/orders", {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      }),
      fetch("/api/account/profile", {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      })
    ]);

    const ordersData = await ordersRes.json().catch(() => ({}));
    const profileData = await profileRes.json().catch(() => ({}));

    setLoading(false);

    if (ordersRes.ok) {
      setOrders(ordersData.orders || []);
    }

    if (profileRes.ok && profileData.profile) {
      setProfile({
        ...profileData.profile,
        addresses: profileData.profile.addresses?.length
          ? profileData.profile.addresses
          : [emptyAddress]
      });
    }

    if (!ordersRes.ok || !profileRes.ok) {
      setMessage(ordersData.error || profileData.error || "Não foi possível carregar a conta.");
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();

    if (!session?.access_token) return;

    setLoading(true);
    setMessage("");

    const res = await fetch("/api/account/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(profile)
    });

    const data = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || "Erro ao guardar perfil.");
      return;
    }

    setProfile(data.profile);
    setMessage("Perfil guardado.");
  }

  function updateAddress(key: string, value: string) {
    const addresses = profile.addresses?.length ? [...profile.addresses] : [emptyAddress];

    addresses[0] = {
      ...addresses[0],
      [key]: value
    };

    setProfile({
      ...profile,
      addresses
    });
  }

  if (!supabaseReady) {
    return (
      <main className="account-page">
        <section className="account-hero">
          <p className="eyebrow">account</p>
          <h1>Área de cliente</h1>
          <p>
            A área de cliente precisa da variável NEXT_PUBLIC_SUPABASE_ANON_KEY
            configurada na Vercel.
          </p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="account-page">
        <section className="account-hero">
          <p className="eyebrow">account</p>
          <h1>Área de cliente</h1>
          <p>
            Cria conta ou entra para veres encomendas, moradas, pagamentos e dados
            da tua conta Lounge by Gigi.
          </p>
        </section>

        <section className="account-grid">
          <form
            className="account-card"
            onSubmit={mode === "register" ? register : mode === "reset" ? resetPassword : login}
          >
            <p className="eyebrow">{mode}</p>
            <h2>
              {mode === "register"
                ? "Criar conta"
                : mode === "reset"
                ? "Recuperar password"
                : "Entrar"}
            </h2>

            {mode === "register" ? (
              <label>
                Nome
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="O teu nome"
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="email@exemplo.com"
              />
            </label>

            {mode !== "reset" ? (
              <label>
                Password
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Password"
                />
              </label>
            ) : null}

            <button className="pill dark-pill" disabled={loading}>
              {loading
                ? "A processar..."
                : mode === "register"
                ? "Criar conta"
                : mode === "reset"
                ? "Enviar email"
                : "Entrar"}
            </button>

            {message ? <p className="muted">{message}</p> : null}
          </form>

          <div className="account-card">
            <p className="eyebrow">opções</p>
            <h2>Acesso</h2>

            <div className="account-links">
              <button className="pill" onClick={() => setMode("login")}>Entrar</button>
              <button className="pill" onClick={() => setMode("register")}>Criar conta</button>
              <button className="pill" onClick={() => setMode("reset")}>Recuperar password</button>
            </div>

            <p className="muted">
              Usa o mesmo email da compra para conseguires ver as encomendas.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const address = profile.addresses?.[0] || emptyAddress;

  return (
    <main className="account-page">
      <section className="account-hero">
        <p className="eyebrow">account</p>
        <h1>Area de cliente</h1>
        <p>
          Gerir perfil, morada e encomendas associadas a {session.user.email}.
        </p>

        <button className="pill" onClick={logout}>
          Sair
        </button>
      </section>

      <section className="account-grid">
        <form className="account-card" onSubmit={saveProfile}>
          <p className="eyebrow">perfil</p>
          <h2>Dados pessoais</h2>

          <label>
            Nome
            <input
              value={profile.name || ""}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            />
          </label>

          <label>
            Email
            <input value={profile.email || session.user.email || ""} disabled />
          </label>

          <label>
            Telefone
            <input
              value={profile.phone || ""}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
            />
          </label>

          <h3>Morada principal</h3>

          <label>
            Morada
            <input
              value={address.line1 || ""}
              onChange={(event) => updateAddress("line1", event.target.value)}
            />
          </label>

          <label>
            Apartamento, andar, detalhes
            <input
              value={address.line2 || ""}
              onChange={(event) => updateAddress("line2", event.target.value)}
            />
          </label>

          <label>
            Cidade
            <input
              value={address.city || ""}
              onChange={(event) => updateAddress("city", event.target.value)}
            />
          </label>

          <label>
            Código postal
            <input
              value={address.postalCode || ""}
              onChange={(event) => updateAddress("postalCode", event.target.value)}
            />
          </label>

          <label>
            País
            <input
              value={address.country || ""}
              onChange={(event) => updateAddress("country", event.target.value)}
            />
          </label>

          <button className="pill dark-pill" disabled={loading}>
            {loading ? "A guardar..." : "Guardar perfil"}
          </button>

          {message ? <p className="muted">{message}</p> : null}
        </form>

        <div className="account-card">
          <p className="eyebrow">support</p>
          <h2>Ajuda</h2>
          <p>
            Consulta políticas de envio/devolução ou contacta a loja sobre uma
            encomenda.
          </p>

          <div className="account-links">
            <Link className="pill" href="/contact">Contacto</Link>
            <Link className="pill" href="/shipping-policy">Envios</Link>
            <Link className="pill" href="/returns-policy">Devoluções</Link>
          </div>
        </div>
      </section>

      <section className="account-orders">
        <div className="section-heading">
          <p className="eyebrow">orders</p>
          <h2>As tuas encomendas</h2>
        </div>

        {orders.length === 0 ? (
          <div className="empty-orders">
            <p>Ainda não existem encomendas associadas a esta conta.</p>
            <Link className="pill dark-pill" href="/shop?gender=women">
              Ver loja
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-head">
                  <div>
                    <p className="eyebrow">encomenda</p>
                    <h3>{order.id}</h3>
                  </div>

                  <span className="order-status">{statusLabel(order.status)}</span>
                </div>

                <div className="order-meta">
                  <span>Total: {Number(order.total || 0).toFixed(2)} {order.currency || "EUR"}</span>
                  <span>Pagamento: {order.paymentProvider || "—"}</span>
                  {order.createdAt ? <span>Data: {String(order.createdAt).slice(0, 10)}</span> : null}
                  <span>Recibo: {order.receiptSent ? "Enviado" : "Pendente"}</span>
                </div>

                <div className="order-items">
                  {order.items?.length ? (
                    order.items.map((item, index) => (
                      <div className="order-item" key={`${order.id}-${index}`}>
                        <span>{item.title}</span>
                        <small>
                          {item.quantity || 1}x
                          {item.variant ? ` · ${item.variant}` : ""}
                          {item.size ? ` · ${item.size}` : ""}
                          {item.color ? ` · ${item.color}` : ""}
                        </small>
                      </div>
                    ))
                  ) : (
                    <p className="muted">Detalhes dos produtos indisponíveis.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
