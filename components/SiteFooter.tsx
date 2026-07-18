"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NewsletterSignup from "@/components/NewsletterSignup";

export default function SiteFooter() {
  const pathname = usePathname();

  if (pathname.includes("control")) return null;

  return (
    <footer className="site-footer">
      <div>
        <p className="eyebrow">Lounge by Gigi</p>
        <h2>Every piece is made to feel intentional.</h2>
        <p>
          Fashion, swimwear, essentials and selected pieces produced on demand
          through trusted fulfilment partners.
        </p>

        <NewsletterSignup />
      </div>

      <nav>
        <Link href="/about">Sobre</Link>
        <Link href="/shipping-policy">Envios</Link>
        <Link href="/returns-policy">Devoluções</Link>
        <Link href="/privacy-policy">Privacidade</Link>
        <Link href="/terms">Termos</Link>
        <Link href="/contact">Contacto</Link>
      </nav>
    </footer>
  );
}
