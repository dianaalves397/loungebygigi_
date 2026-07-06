import { getCachedCategories } from "@/lib/cache";
import NavClient from "@/components/NavClient";
import { orderWithChildren } from "@/lib/categoryUtils";

function sortCategories(categories: any[]) {
  return [...categories].sort((a, b) => {
    const orderA = Number(a.sortOrder || 999);
    const orderB = Number(b.sortOrder || 999);

    if (orderA !== orderB) return orderA - orderB;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function filterByGender(categories: any[], gender: "men" | "women") {
  return orderWithChildren(sortCategories(categories).filter((category) => {
    const id = String(category.id || "").toLowerCase();
    const name = String(category.name || "").toLowerCase();
    const categoryGender = String(category.gender || "unisex").toLowerCase();

    if (id === "printful" || id === "printify" || name === "printful" || name === "printify") {
      return false;
    }

    return categoryGender === gender || categoryGender === "unisex";
  }));
}

export default async function Nav() {
  const categories = await getCachedCategories();

  return (
    <NavClient
      womenCategories={filterByGender(categories, "women")}
      menCategories={filterByGender(categories, "men")}
    />
  );
}

