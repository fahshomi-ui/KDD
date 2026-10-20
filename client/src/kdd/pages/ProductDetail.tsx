import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Snowflake,
  Truck,
  X,
} from "lucide-react";
import Layout from "@/kdd/components/Layout";
import ProductCard from "@/kdd/components/ProductCard";
import { ErrorState, LoadingState } from "@/kdd/components/CatalogState";
import { useLanguage } from "@/kdd/contexts/LanguageContext";
import { useCart } from "@/kdd/contexts/CartContext";
import {
  useConnectionStatus,
  useProduct,
  useProductImages,
  useProducts,
} from "@/kdd/hooks/useStore";

const PREPS = [
  { id: "clean", ar: "تنظيف", en: "Cleaning" },
  { id: "skin", ar: "سلخ", en: "Skinning" },
  { id: "fillet", ar: "فيليه", en: "Filleting" },
  { id: "slice", ar: "شرائح", en: "Slicing" },
];

export default function ProductDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { lang, t } = useLanguage();
  const { addItem } = useCart();
  const productQuery = useProduct(id);
  const connection = useConnectionStatus();
  const imagesQuery = useProductImages(id);
  const allProductsQuery = useProducts();
  const [quantity, setQuantity] = useState(1);
  const [active, setActive] = useState(0);
  const [preparations, setPreparations] = useState<string[]>([]);
  const product = productQuery.data as any;
  const images = ((imagesQuery.data ?? []) as any[])
    .map(image => image.image_url)
    .filter(Boolean);
  const gallery = images.length
    ? images
    : product?.image_url
      ? [product.image_url]
      : [];
  const related = useMemo(
    () =>
      (allProductsQuery.data ?? [])
        .filter(
          (item: any) =>
            item.category_id === product?.category_id && item.id !== product?.id
        )
        .slice(0, 5) as any[],
    [allProductsQuery.data, product?.category_id, product?.id]
  );

  if (productQuery.isLoading)
    return (
      <Layout>
        <div className="kdd-container py-10">
          <LoadingState />
        </div>
      </Layout>
    );
  if (connection === "not-configured")
    return (
      <Layout>
        <div className="kdd-container py-10">
          <ErrorState
            message={
              lang === "ar"
                ? "خدمة المتجر غير مهيأة حالياً؛ لا توجد منتجات أو أسعار للعرض."
                : "The storefront service is not configured; no products or prices are available."
            }
          />
        </div>
      </Layout>
    );
  if (productQuery.error)
    return (
      <Layout>
        <div className="kdd-container py-10">
          <ErrorState message={productQuery.error} />
        </div>
      </Layout>
    );
  if (!product)
    return (
      <Layout>
        <div className="kdd-container py-20 text-center">
          {lang === "ar" ? "المنتج غير موجود." : "Product not found."}
        </div>
      </Layout>
    );

  const name = lang === "ar" ? product.name_ar : product.name_en;
  const description =
    lang === "ar" ? product.description_ar : product.description_en;
  const categoryName = product.category
    ? lang === "ar"
      ? product.category.name_ar
      : product.category.name_en
    : "";
  const price = Number(product.price || 0);
  const oldPrice = Number(product.old_price || 0);
  const discounted = oldPrice > price;
  const add = () =>
    addItem(product, quantity, preparations.length ? preparations : undefined);

  return (
    <Layout>
      <div className="kdd-container py-5 md:py-10">
        <nav className="mb-5 flex gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            {lang === "ar" ? "الرئيسية" : "Home"}
          </Link>
          {categoryName && (
            <>
              <span>/</span>
              <Link
                to={`/category/${product.category?.slug}`}
                className="hover:text-primary"
              >
                {categoryName}
              </Link>
            </>
          )}
        </nav>
        <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-white">
              {gallery.length ? (
                <img
                  src={gallery[active] || gallery[0]}
                  alt={name}
                  className="h-full w-full object-contain p-6"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  {lang === "ar"
                    ? "لا توجد صورة لهذا المنتج"
                    : "No product image"}
                </div>
              )}
              {discounted && (
                <span className="absolute start-4 top-4 rounded-full bg-primary px-3 py-1 text-sm font-black text-primary-foreground">
                  -{Math.round((1 - price / oldPrice) * 100)}%
                </span>
              )}
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActive((active - 1 + gallery.length) % gallery.length)
                    }
                    className="absolute start-3 top-1/2 rounded-full bg-background/90 p-2 shadow"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActive((active + 1) % gallery.length)}
                    className="absolute end-3 top-1/2 rounded-full bg-background/90 p-2 shadow"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex justify-center gap-2">
                {gallery.map((image, index) => (
                  <button
                    type="button"
                    key={image}
                    aria-label={`Image ${index + 1}`}
                    onClick={() => setActive(index)}
                    className={`h-1.5 rounded-full ${index === active ? "w-8 bg-primary" : "w-2 bg-border"}`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="space-y-5">
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              {product.vendor || categoryName || "KDD"}
            </span>
            <h1 className="text-3xl font-black leading-tight md:text-5xl">
              {name}
            </h1>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black text-primary">
                {price.toFixed(3)} {t("products.kwd")}
              </span>
              {discounted && (
                <span className="text-sm text-muted-foreground line-through">
                  {oldPrice.toFixed(3)} {t("products.kwd")}
                </span>
              )}
            </div>
            {product.weight && (
              <p className="text-sm text-muted-foreground">
                {lang === "ar" ? "الوزن:" : "Weight:"} {product.weight}
              </p>
            )}
            <div className="rounded-2xl border border-border bg-secondary/45 p-4 text-sm leading-7">
              {description ||
                (lang === "ar"
                  ? "منتج من تشكيلة كي دي دي."
                  : "A product from the KDD collection.")}
            </div>
            {product.origin && (
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                {product.origin}
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-2">
                <Snowflake className="h-3.5 w-3.5 text-primary" />
                {lang === "ar" ? "جودة مختارة" : "Selected quality"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-2">
                <Truck className="h-3.5 w-3.5 text-primary" />
                {lang === "ar" ? "توصيل متاح" : "Delivery available"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 ${product.in_stock ? "border-emerald-300 text-emerald-700" : "border-destructive/30 text-destructive"}`}
              >
                {product.in_stock ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                {product.in_stock
                  ? lang === "ar"
                    ? "متوفر"
                    : "In stock"
                  : t("products.outOfStock")}
              </span>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">{t("products.quantity")}</p>
              <div className="flex gap-3">
                <div className="flex h-12 items-center rounded-full border border-border">
                  <button
                    type="button"
                    className="px-4"
                    onClick={() => setQuantity(value => Math.max(1, value - 1))}
                    aria-label="Decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-8 text-center font-black">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="px-4"
                    onClick={() =>
                      setQuantity(value => Math.min(99, value + 1))
                    }
                    aria-label="Increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!product.in_stock}
                  onClick={add}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 font-black text-primary-foreground disabled:opacity-50"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {t("products.addToCart")}
                </button>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">
                {lang === "ar"
                  ? "خيارات التحضير (اختياري)"
                  : "Preparation options (optional)"}
              </p>
              <div className="flex flex-wrap gap-2">
                {PREPS.map(prep => {
                  const selected = preparations.includes(prep.id);
                  return (
                    <button
                      type="button"
                      key={prep.id}
                      onClick={() =>
                        setPreparations(current =>
                          selected
                            ? current.filter(value => value !== prep.id)
                            : [...current, prep.id]
                        )
                      }
                      className={`rounded-full border px-3 py-2 text-xs font-bold ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}
                    >
                      {lang === "ar" ? prep.ar : prep.en}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 text-2xl font-black">
              {t("products.relatedProducts")}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {related.map(item => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
