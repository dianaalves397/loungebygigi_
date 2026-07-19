"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CartItem } from "@/types";
import { useLocalization } from "@/components/LocalizationProvider";

export default function CartDrawer({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<"stripe" | "paypal">("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { country } = useLocalization();

  useEffect(() => setMounted(true), []);

  function load() {
    try {
      setItems(JSON.parse(localStorage.getItem("lounge_cart") || "[]"));
    } catch {
      setItems([]);
    }
  }

  function persist(next: CartItem[]) {
    setItems(next);
    localStorage.setItem("lounge_cart", JSON.stringify(next));
    window.dispatchEvent(new Event("lounge-cart"));
  }

  function removeItem(index: number) {
    persist(items.filter((_, i) => i !== index));
  }

  function setQuantity(index: number, quantity: number) {
    const clamped = Math.max(1, Math.min(20, quantity));
    persist(items.map((item, i) => (i === index ? { ...item, quantity: clamped } : item)));
  }

  useEffect(() => {
    load();
    window.addEventListener("lounge-cart", load);
    return () => window.removeEventListener("lounge-cart", load);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const shipping = subtotal >= 90 || subtotal === 0 ? 0 : 5.9;
  const total = subtotal + shipping;

  function money(value?: number) {
    return new Intl.NumberFormat(country.language || "pt", {
      style: "currency",
      currency: country.currency || "EUR"
    }).format(Number(value || 0) * Number(country.rate || 1));
  }

  async function checkout() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, customerEmail: email, provider })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível criar a encomenda.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      persist([]);
      alert(`${data.message || "Encomenda registada."}${data.orderId ? `\nID: ${data.orderId}` : ""}`);
      onClose();
    } catch {
      setError("Não foi possível ligar ao servidor. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <div className={`lg-cart-overlay ${open ? "open" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`lg-cart-panel ${open ? "open" : ""}`} aria-label="Carrinho de compras">
        <div className="lg-cart-header">
          <h2>O teu saco</h2>
          <button type="button" className="lg-cart-close" onClick={onClose} aria-label="Fechar carrinho">
            ×
          </button>
        </div>

        <div className="lg-cart-list">
          {items.length === 0 ? (
            <div className="lg-cart-empty">
              <p>O teu saco está vazio.</p>
              <button type="button" className="lg-cart-continue" onClick={onClose}>
                Continuar a explorar
              </button>
            </div>
          ) : (
            items.map((item, index) => (
              <div className="lg-cart-item" key={`${item.productId}-${item.color}-${item.size}-${index}`}>
                <img src={item.image} alt={item.title} loading="lazy" />
                <div className="lg-cart-item-info">
                  <h3>{item.title}</h3>
                  {item.category ? <p className="lg-cart-item-category">{item.category}</p> : null}
                  <p className="lg-cart-item-variant">
                    {item.color || "Sem cor"} · {item.size || "Tamanho único"}
                  </p>
                  <div className="lg-cart-item-row">
                    <div className="lg-cart-qty">
                      <button type="button" onClick={() => setQuantity(index, item.quantity - 1)} aria-label="Diminuir quantidade">
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => setQuantity(index, item.quantity + 1)} aria-label="Aumentar quantidade">
                        +
                      </button>
                    </div>
                    <strong>{money(item.price * item.quantity)}</strong>
                  </div>
                </div>
                <button type="button" className="lg-cart-remove" onClick={() => removeItem(index)} aria-label="Remover produto">
                  Remover
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 ? (
          <div className="lg-cart-footer">
            <label className="lg-cart-field">
              <span>Email para recibo</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="cliente@email.com"
              />
            </label>

            <label className="lg-cart-field">
              <span>Método de pagamento</span>
              <select value={provider} onChange={(event) => setProvider(event.target.value as "stripe" | "paypal")}>
                <option value="stripe">Cartão / Apple Pay / Google Pay</option>
                <option value="paypal">PayPal</option>
              </select>
            </label>

            <div className="lg-cart-summary">
              <div>
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <div>
                <span>Envio estimado</span>
                <strong>{shipping === 0 ? "Grátis" : money(shipping)}</strong>
              </div>
              <div className="lg-cart-total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
            </div>

            {error ? <p className="lg-cart-error">{error}</p> : null}

            <button type="button" className="lg-cart-checkout" disabled={loading} onClick={checkout}>
              {loading ? "A processar…" : "Finalizar compra"}
            </button>
          </div>
        ) : null}
      </aside>
    </>,
    document.body
  );
}
