"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import CartButton from "@/components/CartButton";

function SearchToggle() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = inputRef.current?.value.trim();
    setOpen(false);
    router.push(value ? `/shop?q=${encodeURIComponent(value)}` : "/shop");
  };

  return (
    <div className={`old-nav-search${open ? " is-open" : ""}`}>
      {open ? (
        <form onSubmit={submit} role="search">
          <input
            ref={inputRef}
            type="search"
            name="q"
            placeholder="Procurar produtos…"
            aria-label="Procurar produtos"
            onBlur={() => setOpen(false)}
          />
        </form>
      ) : (
        <button
          type="button"
          className="old-nav-search-btn"
          aria-label="Procurar"
          onClick={openSearch}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="6.2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13.2 13.2L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

type Category = {
  id: string;
  name: string;
  parentId?: string;
  gender?: string;
  sortOrder?: number;
};

export default function NavClient({
  womenCategories,
  menCategories
}: {
  womenCategories: Category[];
  menCategories: Category[];
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="old-nav">
      <Link className="old-nav-logo" href="/">
        lounge
      </Link>

      <nav className="old-nav-center">
        {!isHome ? <Link href="/">Página inicial</Link> : null}

        <details className="old-nav-dropdown">
          <summary>Men</summary>
          <div className="old-nav-dropdown-menu">
            <Link href="/collections/men">Moodboard Man</Link>
            <Link href="/shop?gender=men">Ver todas as peças Men</Link>
            {menCategories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?gender=men&category=${category.id}`}
                style={category.parentId ? { paddingLeft: 18, opacity: 0.85 } : undefined}
              >
                {category.parentId ? "— " : ""}{category.name}
              </Link>
            ))}
          </div>
        </details>

        <details className="old-nav-dropdown">
          <summary>Women</summary>
          <div className="old-nav-dropdown-menu">
            <Link href="/collections/women">Moodboard Woman</Link>
            <Link href="/shop?gender=women">Ver todas as peças Women</Link>
            {womenCategories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?gender=women&category=${category.id}`}
                style={category.parentId ? { paddingLeft: 18, opacity: 0.85 } : undefined}
              >
                {category.parentId ? "— " : ""}{category.name}
              </Link>
            ))}
          </div>
        </details>
      </nav>

      <div className="old-nav-right">
        <SearchToggle />

        <select className="old-nav-select" defaultValue="PT-EUR">
          <option value="PT-EUR">PT · EUR</option>
        </select>

        <Link className="old-nav-account" href="/account">
          Conta
        </Link>

        <CartButton />
      </div>
    </header>
  );
}
