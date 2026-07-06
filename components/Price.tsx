"use client";

import { useLocalization } from "@/components/LocalizationProvider";

export default function Price({ value }: { value?: number }) {
  const { country } = useLocalization();
  const amount = Number(value || 0) * Number(country.rate || 1);

  return (
    <>
      {new Intl.NumberFormat(country.language || "pt", {
        style: "currency",
        currency: country.currency || "EUR"
      }).format(amount)}
    </>
  );
}

