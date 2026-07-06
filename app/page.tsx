// Página de entrada — WOMAN | MAN em ecrã inteiro.
// Estática com revalidação por tag: zero CPU por visita.

import LandingHero from "@/components/landing/LandingHero";
import { getCachedPublicSettings } from "@/lib/cache";

export const revalidate = 3600;

export default async function Home() {
  const settings = await getCachedPublicSettings();
  const landing = settings.landing || {};

  return (
    <main>
      <LandingHero
        womanImage={landing.womanImage || "/image_casal_gelado.jpg"}
        manImage={landing.manImage || "/image_tenis.jpg"}
        womanLabel={landing.womanLabel || "Woman"}
        manLabel={landing.manLabel || "Man"}
        brandName={settings.brand?.name || "Lounge by Gigi"}
      />
    </main>
  );
}
