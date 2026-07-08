"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SORT_OPTIONS } from "@/lib/sortProducts";

export default function SortControl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("sort") || "";

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("sort", value);
    else next.delete("sort");

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <label className="lgc-sort">
      <span className="lgc-sr">Ordenar</span>
      <select value={current} onChange={(event) => onChange(event.target.value)}>
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
