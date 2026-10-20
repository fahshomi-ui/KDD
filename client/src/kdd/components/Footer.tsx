import { Link } from "react-router-dom";
import { useLanguage } from "@/kdd/contexts/LanguageContext";

export default function Footer() {
  const { lang, t } = useLanguage();
  return (
    <footer className="mt-12 border-t border-border bg-secondary/45">
      <div className="kdd-container grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <div className="mb-3 text-xl font-black text-primary">KDD</div>
          <h2 className="mb-2 font-extrabold text-foreground">
            {t("footer.about")}
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {lang === "ar"
              ? "منتجات ألبان وعصائر وآيس كريم ومنتجات طهي كويتية منذ 1962."
              : "Kuwaiti dairy, juices, ice cream and cooking products since 1962."}
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-extrabold text-foreground">
            {t("footer.links")}
          </h2>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link className="hover:text-primary" to="/">
              {t("nav.home")}
            </Link>
            <Link className="hover:text-primary" to="/products">
              {t("nav.products")}
            </Link>
            <Link className="hover:text-primary" to="/cart">
              {t("nav.cart")}
            </Link>
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-extrabold text-foreground">
            {t("footer.contact")}
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {lang === "ar"
              ? "يسعدنا استقبال طلباتكم من خلال المتجر."
              : "We are happy to receive your orders through the storefront."}
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © KDD · {lang === "ar" ? "جميع الحقوق محفوظة" : "All rights reserved"}
      </div>
    </footer>
  );
}
