import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import { useLanguage } from "@/kdd/contexts/LanguageContext";
import { useCart } from "@/kdd/contexts/CartContext";
import { useCategoryTree } from "@/kdd/hooks/useStore";

export default function Header() {
  const { lang, setLang, t } = useLanguage();
  const { totalItems } = useCart();
  const { data: tree } = useCategoryTree();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navCategories =
    tree?.[0]?.slug === "section-kdd" && tree[0].children?.length
      ? tree[0].children
      : (tree ?? []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-primary text-primary-foreground shadow-lg">
      <div className="hidden border-b border-white/10 bg-black/10 md:block">
        <div className="kdd-container flex h-8 items-center justify-between text-xs text-white/75">
          <span>
            {lang === "ar"
              ? "توصيل إلى كل مناطق الكويت"
              : "Delivery across Kuwait"}
          </span>
          <span>
            {lang === "ar" ? "كي دي دي — منذ 1962" : "KDD — since 1962"}
          </span>
        </div>
      </div>
      <div className="kdd-container flex h-16 items-center justify-between gap-3">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="KDD"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-primary">
            KDD
          </span>
          <span className="hidden font-extrabold leading-tight sm:block">
            <span className="block text-sm">
              {lang === "ar" ? "كي دي دي" : "KDD"}
            </span>
            <span className="block text-[10px] text-white/65">
              {lang === "ar" ? "طازج كل يوم" : "Fresh every day"}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            className={`kdd-nav-link ${pathname === "/" ? "kdd-nav-link-active" : ""}`}
            to="/"
          >
            {t("nav.home")}
          </Link>
          <Link
            className={`kdd-nav-link ${pathname === "/products" ? "kdd-nav-link-active" : ""}`}
            to="/products"
          >
            {t("nav.products")}
          </Link>
          {navCategories.slice(0, 4).map((category: any) => (
            <Link
              key={category.id ?? category.slug}
              className="kdd-nav-link"
              to={`/category/${category.slug}`}
            >
              {lang === "ar" ? category.name_ar : category.name_en}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="rounded-xl px-2.5 py-2 text-xs font-bold text-white/85 hover:bg-white/10"
            aria-label="Toggle language"
          >
            {lang === "ar" ? "EN" : "عربي"}
          </button>
          <Link
            to="/products"
            className="hidden rounded-xl p-2 text-white/85 hover:bg-white/10 sm:block"
            aria-label={t("products.search")}
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            to="/cart"
            className="relative rounded-xl p-2 text-white/90 hover:bg-white/10"
            aria-label={t("nav.cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -end-1 -top-1 min-w-5 rounded-full bg-white px-1 text-center text-[10px] font-black text-primary">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(value => !value)}
            className="rounded-xl p-2 text-white/90 hover:bg-white/10 lg:hidden"
            aria-label={lang === "ar" ? "فتح القائمة" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-primary px-4 py-3 lg:hidden">
          <nav className="kdd-container flex flex-col gap-1">
            <Link
              className="rounded-lg px-3 py-2 font-bold hover:bg-white/10"
              to="/"
            >
              {t("nav.home")}
            </Link>
            <Link
              className="rounded-lg px-3 py-2 font-bold hover:bg-white/10"
              to="/products"
            >
              {t("nav.products")}
            </Link>
            {navCategories.map((category: any) => (
              <Link
                key={category.id ?? category.slug}
                className="rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                to={`/category/${category.slug}`}
              >
                {lang === "ar" ? category.name_ar : category.name_en}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
