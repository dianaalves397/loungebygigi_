"use client";

import { useEffect, useState } from "react";

const OPTIONS = [2, 3, 4];
const STORAGE_KEY = "lounge:mobile-grid-cols";
const DEFAULT_COLS = 3;

function apply(cols: number) {
  document.documentElement.style.setProperty("--mobile-grid-cols", String(cols));
  document.documentElement.setAttribute("data-grid-cols", String(cols));
}

export default function GridDensityControl() {
  const [cols, setCols] = useState(DEFAULT_COLS);

  useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    const initial = OPTIONS.includes(saved) ? saved : DEFAULT_COLS;
    setCols(initial);
    apply(initial);
  }, []);

  function choose(value: number) {
    setCols(value);
    localStorage.setItem(STORAGE_KEY, String(value));
    apply(value);
  }

  return (
    <div className="grid-density-control">
      <span className="grid-density-label">Ver</span>
      {OPTIONS.map((value) => (
        <button
          key={value}
          type="button"
          className={cols === value ? "grid-density-btn active" : "grid-density-btn"}
          onClick={() => choose(value)}
          aria-label={`${value} produtos por linha`}
          aria-pressed={cols === value}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
