"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CartButton from "@/components/CartButton";
import { type Locale, LOCALES, detectLocale, getTranslations, saveLocale } from "@/lib/i18n";

function SearchToggle({ placeholder, label }: { placeholder: string; label: string }) {
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
            placeholder={placeholder}
            aria-label={label}
            onBlur={() => setOpen(false)}
          />
        </form>
      ) : (
        <button
          type="button"
          className="old-nav-search-btn"
          aria-label={label}
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

  const [locale, setLocaleState] = useState<Locale>("pt");

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const t = getTranslations(locale);

  function changeLocale(code: Locale) {
    setLocaleState(code);
    saveLocale(code);
    // update <html lang> for accessibility and browser translate
    document.documentElement.lang = code;
  }

  return (
    <header className="old-nav">
      <Link className="old-nav-logo" href="/">
        lounge
      </Link>

      <nav className="old-nav-center">
        {!isHome ? <Link href="/">{t.home}</Link> : null}

        <details className="old-nav-dropdown">
          <summary>{t.men}</summary>
          <div className="old-nav-dropdown-menu">
            <Link href="/collections/men">{t.moodboardMen}</Link>
            <Link href="/shop?gender=men">{t.allMen}</Link>
            {menCategories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.id}?from=men`}
                style={category.parentId ? { paddingLeft: 18, opacity: 0.85 } : undefined}
              >
                {category.parentId ? "— " : ""}{category.name}
              </Link>
            ))}
          </div>
        </details>

        <details className="old-nav-dropdown">
          <summary>{t.women}</summary>
          <div className="old-nav-dropdown-menu">
            <Link href="/collections/women">{t.moodboardWomen}</Link>
            <Link href="/shop?gender=women">{t.allWomen}</Link>
            {womenCategories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.id}?from=women`}
                style={category.parentId ? { paddingLeft: 18, opacity: 0.85 } : undefined}
              >
                {category.parentId ? "— " : ""}{category.name}
              </Link>
            ))}
          </div>
        </details>
      </nav>

      <div className="old-nav-right">
        <SearchToggle placeholder={t.searchPlaceholder} label={t.search} />

        <select
          className="old-nav-select"
          value={locale}
          onChange={(e) => changeLocale(e.target.value as Locale)}
          aria-label="Language"
        >
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>

        <Link className="old-nav-account" href="/account">
          {t.account}
        </Link>

        <CartButton />
      </div>
    </header>
  );
}
