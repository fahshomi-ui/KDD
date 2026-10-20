import { useState, type ReactNode } from "react";
import { Flame, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Header from "@/kdd/components/Header";
import Footer from "@/kdd/components/Footer";
import { useCart } from "@/kdd/contexts/CartContext";
import { useLanguage } from "@/kdd/contexts/LanguageContext";

function PromoBanner() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="kdd-promo-banner">
      <div className="kdd-promo-shimmer" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-center gap-2 pe-8 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Flame className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
          <Link
            to="/products"
            className="text-xs font-extrabold leading-tight underline-offset-4 hover:underline sm:text-sm md:text-base"
          >
            {lang === "ar"
              ? "خصم 50% على جميع المنتجات!"
              : "50% OFF All Products!"}
          </Link>
        </div>
        <span className="hidden text-xs text-primary-foreground/80 sm:inline">
          {lang === "ar" ? "تسوّق الآن" : "Shop now"}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label={lang === "ar" ? "إغلاق" : "Close"}
        className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1 transition-colors hover:bg-primary-foreground/20 sm:end-3"
      >
        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
}

export default function Layout({
  children,
  hideFooter = false,
}: {
  children: ReactNode;
  hideFooter?: boolean;
}) {
  const { lang } = useLanguage();
  const { totalItems, total } = useCart();
  const { pathname } = useLocation();
  const showCartBar =
    totalItems > 0 && pathname !== "/cart" && pathname !== "/checkout";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PromoBanner />
      <Header />
      <main className={showCartBar ? "flex-1 pb-24 md:pb-0" : "flex-1"}>
        {children}
      </main>
      {!hideFooter && <Footer />}
      {showCartBar && (
        <div className="fixed inset-x-3 bottom-3 z-30 md:hidden">
          <Link
            to="/cart"
            className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-xl"
          >
            <span className="font-bold">
              {lang === "ar"
                ? `عرض السلة (${totalItems})`
                : `View cart (${totalItems})`}
            </span>
            <span className="font-black">
              {total.toFixed(3)} {lang === "ar" ? "د.ك" : "KWD"}
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
