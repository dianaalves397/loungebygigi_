"use client";

// Escolhe a experiência da categoria NO CLIENTE (lendo ?from= do URL),
// para que as páginas de categoria continuem estáticas na Vercel —
// zero function invocations por visita, servidas do cache do edge.

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CategoryEditorial from "@/components/category/CategoryEditorial";
import SportsExperience from "@/components/category/SportsExperience";
import SummerExperience from "@/components/category/SummerExperience";
import AccessoriesExperience from "@/components/category/AccessoriesExperience";
import LoungewearExperience from "@/components/category/LoungewearExperience";
import { sortProducts } from "@/lib/sortProducts";

function Inner(rawProps: any) {
  const params = useSearchParams();
  const from = params.get("from") || undefined;
  const sort = params.get("sort") || "";
  const id = rawProps.categoryId as string;
  const props = { ...rawProps, products: sortProducts(rawProps.products || [], sort) };

  if (["acessorios", "jewellery", "bags", "sunglasses", "hats"].includes(id)) {
    return <AccessoriesExperience {...props} variant={from === "men" ? "sun" : "sea"} />;
  }
  if (["loungewear", "tops", "shapewear"].includes(id)) {
    return <LoungewearExperience {...props} variant={from === "men" ? "man" : "woman"} />;
  }
  if (id === "w-sports") return <SportsExperience {...props} edition="woman" />;
  if (id === "m-sports") return <SportsExperience {...props} edition="man" />;
  if (id === "sports") return <SportsExperience {...props} edition={from === "men" ? "man" : "woman"} />;
  if (id === "summer" || id === "swimwear") {
    return <SummerExperience {...props} edition={from === "men" ? "summerMan" : "summer"} />;
  }
  return <CategoryEditorial {...props} />;
}

export default function ExperienceSwitch(props: any) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
