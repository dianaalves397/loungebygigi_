'use client';

import Link from 'next/link';

export default function MobileMoodboard() {

  const show = false;

  if (!show) return null;


  return (
    <section className="md:hidden relative w-full h-[780px] bg-[#F4F1EB] overflow-hidden">

      {/* CONTAINER CENTRAL (editorial frame) */}
      <div className="relative w-full h-full max-w-[420px] mx-auto">

        {/* SUMMER (top right - leve sobreposição) */}
        <Link
          href="/categories/summer"
          className="group absolute right-3 top-10 w-[44%] z-30"
        >
          <img
            src="/image_casal_barco.jpg"
            alt="Summer"
            className="
              w-full h-auto object-cover
              grayscale contrast-[0.95] brightness-[1.05]
              transition-all duration-700
              group-active:grayscale-0
              group-hover:grayscale-0
            "
          />

          <p className="text-right mt-2 font-serif italic text-[26px] leading-none text-[#1f1713]">
            Summer
          </p>
        </Link>

        {/* LOUNGEWEAR (imagem principal - centro esquerda) */}
        <Link
          href="/categories/loungewear"
          className="group absolute left-2 top-[150px] w-[62%] z-40"
        >
          <img
            src="/image_casal_gelado.jpg"
            alt="Loungewear"
            className="
              w-full h-auto object-cover
              grayscale contrast-[0.95] brightness-[1.05]
              transition-all duration-700
              group-active:grayscale-0
              group-hover:grayscale-0
            "
          />

          <p className="mt-2 ml-1 font-serif italic text-[28px] text-[#1f1713]">
            LoungeWear
          </p>
        </Link>

        {/* TEXTO CENTRAL (editorial overlay) */}
        <div className="absolute left-1/2 top-[390px] -translate-x-1/2 z-50 text-center">
          <p className="uppercase tracking-[3px] text-[9px] text-black/70">
            Moodboard
          </p>
          <h3 className="font-serif italic text-[30px] leading-[1] text-[#1f1713]">
            For Everyday Life
          </h3>
        </div>

        {/* SPORTS (bottom left pequeno) */}
        <Link
          href="/categories/sports"
          className="group absolute left-6 bottom-12 w-[28%] z-30"
        >
          <img
            src="/image_tenis.jpg"
            alt="Sports"
            className="
              w-full h-auto object-cover
              grayscale contrast-[0.95] brightness-[1.05]
              transition-all duration-700
              group-active:grayscale-0
              group-hover:grayscale-0
            "
          />

          <p className="mt-2 text-center font-serif italic text-[18px] text-[#1f1713]">
            Sports
          </p>
        </Link>

        {/* ADD ONS (bottom right pequeno) */}
        <Link
          href="/categories/addons"
          className="group absolute right-6 bottom-16 w-[26%] z-20"
        >
          <img
            src="/image_esparguete.jpg"
            alt="Add-ons"
            className="
              w-full h-auto object-cover
              grayscale contrast-[0.95] brightness-[1.05]
              transition-all duration-700
              group-active:grayscale-0
              group-hover:grayscale-0
            "
          />

          <p className="mt-2 text-center font-serif italic text-[16px] text-[#1f1713]">
            Add on&apos;s
          </p>
        </Link>

      </div>
    </section>
  );
}
