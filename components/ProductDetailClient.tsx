// @ts-nocheck

"use client";

import { useEffect, useMemo, useState } from "react";
import MediaBlock from "@/components/MediaBlock";
import ProductCard from "@/components/ProductCard";

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value || 0));
}

function cleanText(value: unknown) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/ÃÂ§/g, "ç")
    .replace(/ÃÂ£/g, "ã")
    .replace(/ÃÂ³/g, "ó")
    .replace(/ÃÂª/g, "ê")
    .replace(/ÃÂ¡/g, "á")
    .replace(/ÃÂ©/g, "é")
    .replace(/Ã§/g, "ç")
    .replace(/Ã£/g, "ã")
    .replace(/Ã³/g, "ó")
    .replace(/Ãª/g, "ê")
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: any) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function unique(values: any[]) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value))));
}

function uniqueText(values: any[]) {
  return Array.from(
    new Set(
      values
        .flat()
        .filter(Boolean)
        .map((value) => cleanText(value))
        .filter(Boolean)
    )
  );
}

function isBadProductImage(image: string) {
  const value = String(image || "").toLowerCase();

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {}

  const text = `${value} ${decoded}`;

  const blocked = [
    "printfile-preview",
    "/printfile/",
    "printfile",
    "_thumb.",
    "_thumb_",
    "thumbnail",
    "thumb.png",
    "label",
    "inside",
    "detail",
    "details",
    "stitch",
    "stitching",
    "size-guide",
    "size_guide",
    "guide",
    "closeup",
    "close-up",
    "packaging",
    "thread",
    "neck-label",
    "back-neck",
    "texture",
    "fabric",
    "pattern",
    "macro",
    "zoom",
    "seam",
    "hem",
    "fold",
    "folded",
    "wrinkle",
    "embroidery",
    "embroidered",
    "dtg",
    "placement",
    "template",
    "transparent"
  ];

  return blocked.some((word) => text.includes(word));
}

function cleanImages(images: any[]) {
  return unique(images)
    .map((image) => String(image))
    .filter((image) => image.startsWith("http"))
    .filter((image) => !isBadProductImage(image));
}

function getVariantOptions(product: any) {
  const variants = Array.isArray(product.variantOptions)
    ? product.variantOptions
    : Array.isArray(product.variants)
      ? product.variants
      : [];

  return variants.filter(Boolean);
}

function getColorOptions(product: any, variantOptions: any[]) {
  const fromProduct = Array.isArray(product.colors) ? product.colors : [];
  const fromVariants = variantOptions.map((variant) => variant.color).filter(Boolean);

  const mapped = [...fromProduct, ...fromVariants].map((color) => {
    if (typeof color === "string") return { name: color, hex: "" };

    return {
      name: color.name || color.label || "",
      hex: color.hex || ""
    };
  });

  const map = new Map();

  mapped.forEach((color) => {
    if (color.name && !map.has(normalize(color.name))) {
      map.set(normalize(color.name), color);
    }
  });

  return Array.from(map.values());
}

function getSizeOptions(product: any, variantOptions: any[]) {
  return uniqueText([
    ...(product.sizes || []),
    ...variantOptions.map((variant) => variant.size).filter(Boolean)
  ]);
}

function getGalleryForColor(product: any, variantOptions: any[], selectedColor: string, hasMultipleColors: boolean) {
  const productImages = cleanImages([
    product.image,
    ...(Array.isArray(product.gallery) ? product.gallery : [])
  ]);

  if (hasMultipleColors && selectedColor) {
    const colorVariants = variantOptions.filter(
      (variant) => normalize(variant.color) === normalize(selectedColor)
    );

    const colorImages = cleanImages(
      colorVariants.flatMap((variant) => [
        variant.image,
        ...(Array.isArray(variant.images) ? variant.images : [])
      ])
    );

    if (colorImages.length > 0) {
      return colorImages.slice(0, 8);
    }
  }

  if (productImages.length > 0) {
    return productImages.slice(0, 10);
  }

  return cleanImages([product.image]).slice(0, 1);
}

export default function ProductDetailClient({ product, related = [] }: { product: any; related?: any[] }) {
  const variantOptions = useMemo(() => getVariantOptions(product), [product]);
  const colors = useMemo(() => getColorOptions(product, variantOptions), [product, variantOptions]);
  const sizes = useMemo(() => getSizeOptions(product, variantOptions), [product, variantOptions]);
  const details = useMemo(() => uniqueText(product.details || []), [product]);

  const hasMultipleColors = colors.length > 1;

  const [selectedColor, setSelectedColor] = useState(colors[0]?.name || "");
  const [selectedSize, setSelectedSize] = useState(sizes[0] || "");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [lightboxTouchStart, setLightboxTouchStart] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [message, setMessage] = useState("");

  const gallery = useMemo(
    () => getGalleryForColor(product, variantOptions, selectedColor, hasMultipleColors),
    [product, variantOptions, selectedColor, hasMultipleColors]
  );

  const selectedImage = gallery[currentIndex] || gallery[0] || product.image || "";

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedColor, product.id]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") previousImage();
      if (event.key === "ArrowRight") nextImage();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen, gallery.length]);

  function previousImage() {
    if (gallery.length <= 1) return;

    setCurrentIndex((index) => {
      if (index <= 0) return gallery.length - 1;
      return index - 1;
    });
  }

  function nextImage() {
    if (gallery.length <= 1) return;

    setCurrentIndex((index) => {
      if (index >= gallery.length - 1) return 0;
      return index + 1;
    });
  }

  function handleSwipeEnd(event: any, start: number | null, clear: () => void) {
    if (start === null) return;

    const touchEnd = event.changedTouches?.[0]?.clientX || 0;
    const difference = start - touchEnd;

    if (Math.abs(difference) > 45) {
      if (difference > 0) nextImage();
      else previousImage();
    }

    clear();
  }

  const selectedVariant = useMemo(() => {
    if (!variantOptions.length) return null;

    return (
      variantOptions.find((variant) => {
        const colorOk = !selectedColor || !variant.color || normalize(variant.color) === normalize(selectedColor);
        const sizeOk = !selectedSize || !variant.size || normalize(variant.size) === normalize(selectedSize);
        return colorOk && sizeOk;
      }) || variantOptions[0]
    );
  }, [variantOptions, selectedColor, selectedSize]);

  const displayPrice = Number(selectedVariant?.price || product.price || 0);

  function addToCart() {
    if (hasMultipleColors && !selectedColor) {
      setMessage("Escolhe uma cor.");
      return;
    }

    if (sizes.length > 0 && !selectedSize) {
      setMessage("Escolhe um tamanho.");
      return;
    }

    const item = {
      productId: product.id,
      title: cleanText(product.title || product.name || "Produto"),
      image: selectedImage,
      category: product.category,
      price: displayPrice,
      quantity: 1,
      color: hasMultipleColors ? selectedColor : "",
      size: selectedSize,
      provider: product.provider || product.source,
      providerProductId: product.providerProductId,
      providerVariantId: selectedVariant?.providerVariantId || selectedVariant?.id || product.providerVariantId,
      printfulSyncProductId: product.printfulSyncProductId,
      printfulSyncVariantId: selectedVariant?.syncVariantId || selectedVariant?.id || product.printfulSyncVariantId,
      printifyProductId: product.printifyProductId,
      printifyVariantId: selectedVariant?.printifyVariantId || product.printifyVariantId
    };

    let current = [];

    try {
      current = JSON.parse(localStorage.getItem("lounge_cart") || "[]");
    } catch {
      current = [];
    }

    const existingIndex = current.findIndex(
      (cartItem) =>
        cartItem.productId === item.productId &&
        cartItem.color === item.color &&
        cartItem.size === item.size &&
        cartItem.printfulSyncVariantId === item.printfulSyncVariantId
    );

    if (existingIndex >= 0) current[existingIndex].quantity += 1;
    else current.push(item);

    localStorage.setItem("lounge_cart", JSON.stringify(current));
    window.dispatchEvent(new Event("lounge-cart"));
    setMessage("Produto adicionado ao carrinho.");
  }

  return (
    <main className="product-detail-page premium-product-mobile">
      <section className="product-detail-gallery">
        <div
          className="product-carousel-frame"
          onTouchStart={(event) => setTouchStart(event.touches?.[0]?.clientX || 0)}
          onTouchEnd={(event) => handleSwipeEnd(event, touchStart, () => setTouchStart(null))}
        >
          <button
            className="product-main-image product-zoom-trigger"
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Ver imagem inteira"
          >
            <MediaBlock
              type={product.mediaType || "image"}
              url={selectedImage}
              alt={cleanText(product.title || product.name || "Produto")}
              priority={currentIndex === 0}
            />
          </button>

          {gallery.length > 1 ? (
            <>
              <button
                className="carousel-arrow carousel-arrow-left"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  previousImage();
                }}
                aria-label="Imagem anterior"
              >
                ‹
              </button>

              <button
                className="carousel-arrow carousel-arrow-right"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  nextImage();
                }}
                aria-label="Imagem seguinte"
              >
                ›
              </button>

              <div className="carousel-counter">
                {currentIndex + 1}/{gallery.length}
              </div>
            </>
          ) : null}
        </div>

        {gallery.length > 1 ? (
          <>
            <div className="product-thumbnails">
              {gallery.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  className={currentIndex === index ? "product-thumb active" : "product-thumb"}
                  onClick={() => setCurrentIndex(index)}
                >
                  <img src={image} alt={cleanText(product.title || product.name || "Produto")} loading="lazy" decoding="async" />
                </button>
              ))}
            </div>

            <p className="swipe-hint">Clica na imagem para ver inteira. Desliza ou usa as setas para mudar.</p>
          </>
        ) : (
          <p className="swipe-hint">Clica na imagem para ver inteira.</p>
        )}
      </section>

      <section className="product-buy-panel">
        <p className="eyebrow">{cleanText(product.category || product.collection || "lounge by gigi")}</p>

        <h1>{cleanText(product.title || product.name || "Produto")}</h1>

        <div className="product-price-row">
          <strong>{formatPrice(displayPrice)}</strong>
          {product.compareAt ? <span>{formatPrice(Number(product.compareAt))}</span> : null}
        </div>

        {product.description ? (
          <p className="product-description">{cleanText(product.description)}</p>
        ) : null}

        {hasMultipleColors ? (
          <div className="product-option-block">
            <p>Cor</p>

            <div className="product-option-row">
              {colors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  className={selectedColor === color.name ? "option-chip active" : "option-chip"}
                  onClick={() => setSelectedColor(color.name)}
                >
                  {color.hex ? <span style={{ background: color.hex }} /> : null}
                  {color.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {sizes.length > 0 ? (
          <div className="product-option-block">
            <p>Tamanho</p>

            <div className="product-option-row">
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={selectedSize === size ? "option-chip active" : "option-chip"}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <button className="pill dark-pill product-add-button" type="button" onClick={addToCart}>
          Adicionar ao carrinho
        </button>

        {message ? <p className="product-message">{message}</p> : null}

        <ul className="product-trust-list">
          <li>Produção sob encomenda — envio estimado indicado na política de envios</li>
          <li>Problemas com o artigo? Trocas e reembolsos ao abrigo da política de devoluções</li>
          <li>Pagamento processado de forma segura via Stripe / PayPal</li>
        </ul>

        {details.length > 0 ? (
          <div className="product-details-clean">
            <p className="eyebrow">detalhes</p>

            <ul>
              {details.map((detail) => (
                <li key={detail}>{cleanText(detail)}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {related.length > 0 ? (
        <section className="product-related">
          <p className="eyebrow">também podes gostar</p>
          <h2>Combina bem com</h2>

          <div className="product-related-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mobile-sticky-cart">
        <div>
          <span>{formatPrice(displayPrice)}</span>
          <small>
            {hasMultipleColors || selectedSize
              ? [hasMultipleColors ? selectedColor : "", selectedSize].filter(Boolean).join(" · ")
              : "Seleciona opções"}
          </small>
        </div>

        <button type="button" onClick={addToCart}>
          Adicionar
        </button>
      </div>

      {lightboxOpen ? (
        <div className="product-lightbox" onClick={() => setLightboxOpen(false)}>
          <div
            className="product-lightbox-inner"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => setLightboxTouchStart(event.touches?.[0]?.clientX || 0)}
            onTouchEnd={(event) => handleSwipeEnd(event, lightboxTouchStart, () => setLightboxTouchStart(null))}
          >
            <button className="lightbox-close" type="button" onClick={() => setLightboxOpen(false)} aria-label="Fechar">
              ×
            </button>

            {gallery.length > 1 ? (
              <button className="lightbox-arrow lightbox-arrow-left" type="button" onClick={previousImage} aria-label="Imagem anterior">
                ‹
              </button>
            ) : null}

            <div className="product-lightbox-media">
              <MediaBlock
                type={product.mediaType || "image"}
                url={selectedImage}
                alt={cleanText(product.title || product.name || "Produto")}
                priority
              />
            </div>

            {gallery.length > 1 ? (
              <button className="lightbox-arrow lightbox-arrow-right" type="button" onClick={nextImage} aria-label="Imagem seguinte">
                ›
              </button>
            ) : null}

            <div className="lightbox-counter">
              {currentIndex + 1}/{gallery.length}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

