import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Home, Search, SlidersHorizontal } from "lucide-react";
import Layout from "@/kdd/components/Layout";
import ProductCard from "@/kdd/components/ProductCard";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/kdd/components/CatalogState";
import { useLanguage } from "@/kdd/contexts/LanguageContext";
import {
  useCategoryBySlug,
  useCategoryProducts,
  useCategoryTree,
  useConnectionStatus,
} from "@/kdd/hooks/useStore";

function findPath(nodes: any[], slug: string, trail: any[] = []): any[] | null {
  for (const node of nodes) {
    const path = [...trail, node];
    if (node.slug === slug) return path;
    if (node.children?.length) {
      const found = findPath(node.children, slug, path);
      if (found) return found;
    }
  }
  return null;
}

export default function Category() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { lang } = useLanguage();
  const { data: tree } = useCategoryTree();
  const connection = useConnectionStatus();
  const categoryQuery = useCategoryBySlug(slug);
  const productsQuery = useCategoryProducts(slug);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");
  const path = useMemo(() => findPath(tree ?? [], slug) ?? [], [slug, tree]);
  const current = path[path.length - 1] as any;
  const products = (productsQuery.data ?? []) as any[];
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    const result = products.filter(product =>
      String(lang === "ar" ? product.name_ar : product.name_en)
        .toLocaleLowerCase()
        .includes(q)
    );
    if (sort === "price-asc")
      result.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-desc")
      result.sort((a, b) => Number(b.price) - Number(a.price));
    return result;
  }, [lang, products, search, sort]);
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
  if (!slug || (!categoryQuery.isLoading && !categoryQuery.data))
    return (
      <Layout>
        <div className="kdd-container py-24 text-center">
          <h1 className="text-2xl font-black">
            {lang === "ar" ? "الفئة غير موجودة" : "Category not found"}
          </h1>
          <Link
            to="/"
            className="mt-4 inline-block text-primary hover:underline"
          >
            {lang === "ar" ? "العودة للرئيسية" : "Back home"}
          </Link>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="border-b border-border bg-secondary/40">
        <div className="kdd-container py-6">
          <nav className="mb-4 flex items-center gap-2 overflow-x-auto text-xs text-muted-foreground">
            <Link
              to="/"
              className="inline-flex items-center gap-1 hover:text-primary"
            >
              <Home className="h-3.5 w-3.5" />
              {lang === "ar" ? "الرئيسية" : "Home"}
            </Link>
            {path.map((item: any, index) => (
              <span key={item.id ?? item.slug} className="whitespace-nowrap">
                /{" "}
                {index === path.length - 1 ? (
                  <strong className="text-foreground">
                    {lang === "ar" ? item.name_ar : item.name_en}
                  </strong>
                ) : (
                  <Link
                    className="hover:text-primary"
                    to={`/category/${item.slug}`}
                  >
                    {lang === "ar" ? item.name_ar : item.name_en}
                  </Link>
                )}
              </span>
            ))}
          </nav>
          <h1 className="text-3xl font-black md:text-5xl">
            {lang === "ar" ? current?.name_ar : current?.name_en}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {!productsQuery.isLoading &&
              `${filtered.length} ${lang === "ar" ? "منتج متوفر" : "products available"}`}
          </p>
        </div>
      </div>
      <div className="kdd-container py-7">
        {current?.children?.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {current.children.map((child: any) => (
              <Link
                key={child.id ?? child.slug}
                to={`/category/${child.slug}`}
                className="shrink-0 rounded-full border border-border bg-secondary px-4 py-2 text-sm font-bold hover:border-primary"
              >
                {lang === "ar" ? child.name_ar : child.name_en}
              </Link>
            ))}
          </div>
        )}
        <div className="mx-auto mb-7 flex max-w-xl gap-2">
          <label className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-xl border border-border bg-secondary ps-9 pe-3 outline-none focus:border-primary"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={
                lang === "ar"
                  ? "ابحث في هذا القسم..."
                  : "Search this section..."
              }
            />
          </label>
          <select
            aria-label={lang === "ar" ? "الترتيب" : "Sort"}
            className="rounded-xl border border-border bg-background px-2 text-sm"
            value={sort}
            onChange={event => setSort(event.target.value)}
          >
            <option value="default">
              {lang === "ar" ? "الترتيب" : "Sort"}
            </option>
            <option value="price-asc">
              {lang === "ar" ? "الأقل سعراً" : "Price low"}
            </option>
            <option value="price-desc">
              {lang === "ar" ? "الأعلى سعراً" : "Price high"}
            </option>
          </select>
          <SlidersHorizontal className="hidden h-5 w-5 self-center text-muted-foreground sm:block" />
        </div>
        {productsQuery.isLoading ? (
          <LoadingState />
        ) : productsQuery.error ? (
          <ErrorState message={productsQuery.error} />
        ) : !products.length ? (
          <EmptyState detail />
        ) : !filtered.length ? (
          <div className="kdd-status">
            {lang === "ar" ? "لا توجد نتائج مطابقة." : "No matching products."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
