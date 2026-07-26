"use client";

import Link from "next/link";
import MediaBlock from "@/components/MediaBlock";
import Price from "@/components/Price";
import { Product } from "@/types";

function addToCartQuick(product: Product) {
  let cart: any[] = [];
  try {
    cart = JSON.parse(localStorage.getItem("lounge_cart") || "[]");
  } catch {
    cart = [];
  }

  const color = product.colors?.[0]?.name;
  const size = product.sizes?.[0];

  const existingIndex = cart.findIndex(
    (item) =>
      item.productId === product.id &&
      item.color === color &&
      item.size === size
  );

  if (existingIndex >= 0) {
    cart[existingIndex] = { ...cart[existingIndex], quantity: (cart[existingIndex].quantity || 1) + 1 };
  } else {
    cart.push({
      productId: product.id,
      title: product.title,
      image: product.image,
      category: product.category,
      price: product.price,
      compareAt: product.compareAt,
      quantity: 1,
      color,
      size,
      provider: product.provider,
      providerProductId: product.providerProductId,
      providerVariantId: product.providerVariantId,
      printfulSyncProductId: product.printfulSyncProductId,
      printfulSyncVariantId: product.printfulSyncVariantId,
      printifyProductId: product.printifyProductId,
      printifyVariantId: product.printifyVariantId,
      apliiqSku: product.apliiqSku,
      shopifyVariantId: product.shopifyVariantId,
      printkkDesignId: product.printkkDesignId,
      printkkProductId: product.printkkProductId
    });
  }

  localStorage.setItem("lounge_cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("lounge-cart"));
}

export default function ProductCard({ product }: { product: Product }) {
  const colors = (product.colors || []).filter((color) => color?.hex);
  const onSale = Boolean(product.compareAt && product.compareAt > product.price);
  const discountPct = onSale
    ? Math.round(((product.compareAt! - product.price) / product.compareAt!) * 100)
    : 0;

  return (
    <Link
      className={`product-card${product.naturalImage ? " product-card-natural" : ""}`}
      href={`/product/${product.slug}`}
    >
      <div className="product-media">
        <MediaBlock type={product.mediaType} url={product.image} alt={product.title} />
        {onSale && discountPct > 0 ? <span className="product-card-badge">-{discountPct}%</span> : null}
      </div>

      <div className="product-card-body">
        <div className="product-card-info">
          <h3>{product.title}</h3>

          <div className="price-row">
            <strong>
              <Price value={product.price} />
            </strong>

            {product.compareAt && product.compareAt > product.price ? (
              <span className="compare">
                <Price value={product.compareAt} />
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="product-card-add"
          aria-label={`Adicionar ${product.title} ao saco`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            addToCartQuick(product);
          }}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {colors.length ? (
        <div className="product-card-swatches">
          {colors.slice(0, 6).map((color, index) => (
            <span
              key={`${color.name}-${index}`}
              className="product-card-swatch"
              style={{ backgroundColor: color.hex }}
              title={color.name}
              aria-label={color.name}
              role="img"
            />
          ))}
          {colors.length > 6 ? <span className="product-card-swatch-more">+{colors.length - 6}</span> : null}
        </div>
      ) : null}
    </Link>
  );
}
