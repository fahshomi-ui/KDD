import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import type { DbProduct } from "@/kdd/lib/types";
import { useLanguage } from "@/kdd/contexts/LanguageContext";
import { useCart } from "@/kdd/contexts/CartContext";
import fallbackProductImage from "@/kdd/assets/kdd-hero-dairy.jpg";

export default function ProductCard({
  product,
}: {
  product: DbProduct;
  index?: number;
}) {
  const { lang, t } = useLanguage();
  const { addItem } = useCart();
  const p = product as any;
  const name = lang === "ar" ? p.name_ar : p.name_en;
  const oldPrice = Number(p.old_price || 0);
  const price = Number(p.price || 0);
  const discounted = oldPrice > price;
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        to={`/product/${p.id}`}
        className="relative block aspect-square overflow-hidden bg-muted"
        aria-label={name}
      >
        <img
          src={p.image_url || fallbackProductImage}
          alt={name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {discounted && (
          <span className="absolute start-2 top-2 rounded-full bg-primary px-2 py-1 text-xs font-black text-primary-foreground">
            -{Math.round((1 - price / oldPrice) * 100)}%
          </span>
        )}
        {!p.in_stock && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-bold">
            {t("products.outOfStock")}
          </span>
        )}
      </Link>
      <div className="space-y-3 p-3">
        <Link
          to={`/product/${p.id}`}
          className="block min-h-11 font-bold leading-6 text-foreground hover:text-primary"
        >
          {name}
        </Link>
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="font-black text-primary">
              {price.toFixed(3)}{" "}
              <span className="text-xs">{t("products.kwd")}</span>
            </span>
            {discounted && (
              <span className="text-xs text-muted-foreground line-through">
                {oldPrice.toFixed(3)}
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={!p.in_stock}
            onClick={() => addItem(product)}
            className="rounded-xl bg-primary p-2 text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("products.addToCart")}
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
