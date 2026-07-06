import Link from "next/link";
import MediaBlock from "@/components/MediaBlock";
import Price from "@/components/Price";
import { Product } from "@/types";

export default function ProductCard({ product }: { product: Product }) {
  const subtitle = [product.category, product.style]
    .filter(Boolean)
    .filter((value) => {
      const text = String(value).toLowerCase();
      return text !== "printful" && text !== "printify" && text !== "manual";
    })
    .join(" · ");

  return (
    <Link className="product-card" href={`/product/${product.slug}`}>
      <div className="product-media">
        <MediaBlock type={product.mediaType} url={product.image} alt={product.title} />
      </div>

      <div className="product-card-body">
        <h3>{product.title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}

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
    </Link>
  );
}
