import HeroSlider from "@/kdd/components/HeroSlider";
import { useMemo, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShoppingBasket,
} from "lucide-react";
import Layout from "@/kdd/components/Layout";
import ProductCard from "@/kdd/components/ProductCard";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/kdd/components/CatalogState";
import { useLanguage } from "@/kdd/contexts/LanguageContext";
import {
  useCategoryTree,
  useConnectionStatus,
  useProducts,
} from "@/kdd/hooks/useStore";
import dairyHero from "@/kdd/assets/kdd-hero-dairy.jpg";
import juiceHero from "@/kdd/assets/kdd-hero-juice.jpg";
import iceCreamHero from "@/kdd/assets/kdd-hero-icecream.jpg";
import cookingHero from "@/kdd/assets/kdd-hero-cooking.jpg";

function Rail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (direction: number) =>
    ref.current?.scrollBy({
      left: direction * Math.max(280, ref.current.clientWidth * 0.75),
      behavior: "smooth",
    });
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => move(-1)}
        className="absolute start-0 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow sm:flex"
        aria-label="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        className="absolute end-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow"
        aria-label="Next"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div
        ref={ref}
        className="flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-7 sm:py-9">
      <h2 className="mb-5 text-center text-2xl font-black sm:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Index() {
  const { lang, t } = useLanguage();
  const productsQuery = useProducts();
  const connection = useConnectionStatus();
  const { data: tree, isLoading: treeLoading } = useCategoryTree();
  const products = productsQuery.data as any[] | undefined;
  const latest = useMemo(
    () =>
      [...(products ?? [])]
        .filter(p => p.in_stock !== false)
        .sort((a, b) =>
          String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
        )
        .slice(0, 12),
    [products]
  );
  const featured = useMemo(() => {
    const explicit = (products ?? []).filter(
      p => p.in_stock !== false && p.featured
    );
    return (
      explicit.length
        ? explicit
        : (products ?? []).filter(p => p.in_stock !== false)
    ).slice(0, 12);
  }, [products]);
  const categories = (tree ?? [])
    .flatMap((node: any) => [node, ...(node.children ?? [])])
    .filter((node: any) => node.image_url)
    .slice(0, 8);
  const categoryTiles = categories.length
    ? categories
    : (tree ?? []).slice(0, 4);

  return (
    <Layout>
      <HeroSlider />

      <div className="kdd-container">
        {connection === "not-configured" ? (
          <section className="py-10">
            <ErrorState
              message={
                lang === "ar"
                  ? "خدمة المتجر غير مهيأة حالياً؛ لا توجد منتجات أو أسعار للعرض."
                  : "The storefront service is not configured; no products or prices are available."
              }
            />
          </section>
        ) : productsQuery.isLoading ? (
          <>
            <Section title={lang === "ar" ? "وصل حديثاً" : "New arrivals"}>
              <LoadingState />
            </Section>
            <Section title={lang === "ar" ? "الأكثر طلباً" : "Popular picks"}>
              <LoadingState />
            </Section>
          </>
        ) : productsQuery.error ? (
          <section className="py-10">
            <ErrorState message={productsQuery.error} />
          </section>
        ) : !products?.length ? (
          <section className="py-10">
            <EmptyState />
          </section>
        ) : (
          <>
            <Section title={lang === "ar" ? "وصل حديثاً" : "New arrivals"}>
              <Rail>
                {latest.map(product => (
                  <div
                    key={product.id}
                    className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[29%] lg:w-[22%]"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </Rail>
            </Section>
            <Section title={lang === "ar" ? "اختياراتنا" : "Our picks"}>
              <Rail>
                {featured.map(product => (
                  <div
                    key={product.id}
                    className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[29%] lg:w-[22%]"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </Rail>
            </Section>
          </>
        )}

        {!treeLoading && categoryTiles.length > 0 && (
          <Section
            title={lang === "ar" ? "تسوّق حسب الفئة" : "Shop by category"}
          >
            <Rail>
              {categoryTiles.map((category: any) => (
                <Link
                  key={category.id ?? category.slug}
                  to={`/category/${category.slug}`}
                  className="group relative h-44 w-[78%] shrink-0 overflow-hidden rounded-2xl border border-border sm:w-[48%] md:w-[31%]"
                >
                  <>
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={
                          lang === "ar" ? category.name_ar : category.name_en
                        }
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src={
                          [dairyHero, juiceHero, iceCreamHero, cookingHero][
                            Math.abs(String(category.slug).length) % 4
                          ]
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </>
                  <span className="absolute inset-0 bg-gradient-to-l from-black/70 to-transparent" />
                  <span className="absolute bottom-4 end-4 max-w-[75%] text-end text-lg font-black text-white">
                    {lang === "ar" ? category.name_ar : category.name_en}
                  </span>
                </Link>
              ))}
            </Rail>
          </Section>
        )}
      </div>
      <section className="border-y border-border bg-secondary/45">
        <div className="kdd-container grid gap-4 py-8 text-center sm:grid-cols-3">
          <div>
            <p className="text-2xl font-black text-primary">1962</p>
            <p className="text-sm text-muted-foreground">
              {lang === "ar" ? "خبرة كويتية" : "Kuwaiti heritage"}
            </p>
          </div>
          <div>
            <p className="text-2xl font-black text-primary">KDD</p>
            <p className="text-sm text-muted-foreground">
              {lang === "ar" ? "جودة نعرفها" : "Quality you know"}
            </p>
          </div>
          <div>
            <p className="text-2xl font-black text-primary">
              {lang === "ar" ? "كل الكويت" : "All Kuwait"}
            </p>
            <p className="text-sm text-muted-foreground">
              {lang === "ar" ? "نصل إلى بابك" : "Delivered to you"}
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
