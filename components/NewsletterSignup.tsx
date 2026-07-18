"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Não foi possível subscrever.");
        return;
      }

      setStatus("done");
      setMessage("Subscrito. Obrigada!");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Não foi possível subscrever.");
    }
  }

  return (
    <div className="footer-newsletter">
      <p>Novidades e lançamentos por email</p>

      <form className="footer-newsletter-form" onSubmit={subscribe}>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="o-teu-email@exemplo.com"
        />
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "..." : "Subscrever"}
        </button>
      </form>

      {message ? <p className="footer-newsletter-message">{message}</p> : null}
    </div>
  );
}
