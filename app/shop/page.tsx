// @ts-nocheck

// Página estática — a leitura de ?gender=/?category=/?q= acontece no
// cliente (useSearchParams dentro do ShopClient), por isso esta página não
// precisa de ser renderizada por pedido: fica em cache no edge como
// qualquer outra página do site.

import Nav from "@/components/Nav";
import ShopClient from "@/components/ShopClient";

export const revalidate = 3600;

export default function ShopPage() {
  return (
    <>
      <Nav />
      <ShopClient initialGender="all" initialCategory="" initialQuery="" />
    </>
  );
}
