import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import knetLogo from "@/kdd/assets/knet-checkout-logo.png";
import mastercardLogo from "@/kdd/assets/mastercard-logo.png";
import visaLogo from "@/kdd/assets/visa-logo.png";
import type { OrderDraft } from "@/kdd/lib/types";
import {
  formatSlot,
  type DeliverySlot,
} from "@/kdd/components/DeliveryWindowPicker";

export interface ConfirmationDetails {
  lines: {
    key: string;
    name: string;
    quantity: number;
    originalTotal: number | null;
    lineTotal: number;
    preparations: string[];
  }[];
  paymentMethod: "knet" | "card";
  totals: {
    baseSubtotal: number;
    campaignDiscount: number;
    couponDiscount: number;
    preparationFees: number;
    deliveryFee: number;
    total: number;
  };
}

export interface CheckoutConfirmationModalProps {
  customer: OrderDraft["customer"];
  details: ConfirmationDetails;
  deliverySlot?: OrderDraft["deliverySlot"];
  lang: "ar" | "en";
  pending: boolean;
  canSend: boolean;
  serverReady: boolean;
  validationError: string;
  onClose: () => void;
  onConfirm: () => void;
}

const money = (amount: number, lang: "ar" | "en") =>
  `${amount.toFixed(3)} ${lang === "ar" ? "د.ك" : "KWD"}`;

const hasValue = (value?: string | null) => Boolean(value && value.trim());

export default function CheckoutConfirmationModal({
  customer,
  details,
  deliverySlot,
  lang,
  pending,
  canSend,
  serverReady,
  validationError,
  onClose,
  onConfirm,
}: CheckoutConfirmationModalProps) {
  const isArabic = lang === "ar";
  const modalRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const hasCapturedFocusRef = useRef(false);
  const latestCloseRef = useRef(onClose);
  const pendingRef = useRef(pending);

  useEffect(() => {
    latestCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (!hasCapturedFocusRef.current) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      hasCapturedFocusRef.current = true;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusableElements = () => {
      const root = modalRef.current;
      if (!root) return [] as HTMLElement[];

      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(element => {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      });
    };

    const initialFocusable = getFocusableElements();
    const initialFocus =
      closeButtonRef.current && !closeButtonRef.current.disabled
        ? closeButtonRef.current
        : initialFocusable[0];
    initialFocus?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!pendingRef.current) latestCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const outsideModal = !modalRef.current?.contains(current);

      if (event.shiftKey && (current === first || outsideModal)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || outsideModal)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const previous = previousFocusRef.current;
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  const text = isArabic
    ? {
        title: "تأكيد المعلومات والدفع",
        deliveryInfo: "معلومات التوصيل",
        name: "الاسم",
        phone: "الهاتف",
        governorate: "المحافظة",
        area: "المنطقة",
        block: "القطعة",
        street: "الشارع",
        building: "المبنى",
        floor: "الدور",
        apartment: "الشقة",
        notes: "ملاحظات",
        deliverySlot: "موعد التوصيل",
        products: "المنتجات",
        payment: "طريقة الدفع",
        knet: "KNET",
        card: "Visa / Mastercard",
        subtotal: "المجموع الفرعي",
        campaignDiscount: "الخصم (خصم 50%)",
        couponDiscount: "خصم الكوبون",
        preparationFees: "رسوم التحضير",
        shipping: "التوصيل",
        free: "مجاني",
        total: "المجموع",
        edit: "تعديل",
        confirm: pending ? "جارٍ إرسال الطلب..." : "تأكيد إرسال الطلب",
        offline: "الخادم غير متصل حالياً؛ حاول مرة أخرى عند عودته.",
        paymentNotice: "الدفع غير مربوط؛ لا تتم أي عملية دفع.",
        missing: "غير متوفر",
      }
    : {
        title: "Confirm information & payment",
        deliveryInfo: "Delivery information",
        name: "Name",
        phone: "Phone",
        governorate: "Governorate",
        area: "Area",
        block: "Block",
        street: "Street",
        building: "Building",
        floor: "Floor",
        apartment: "Apartment",
        notes: "Notes",
        deliverySlot: "Delivery slot",
        products: "Products",
        payment: "Payment method",
        knet: "KNET",
        card: "Visa / Mastercard",
        subtotal: "Subtotal",
        campaignDiscount: "Discount (50% offer)",
        couponDiscount: "Coupon discount",
        preparationFees: "Preparation fees",
        shipping: "Shipping",
        free: "Free",
        total: "Total",
        edit: "Edit",
        confirm: pending ? "Sending order..." : "Confirm order",
        offline:
          "The server is currently offline; please try again when it is available.",
        paymentNotice:
          "Payment is not connected; no payment will be processed.",
        missing: "Unavailable",
      };

  const requiredRows = [
    [text.name, customer.name],
    [text.phone, customer.phone],
    [text.governorate, customer.governorate],
    [text.area, customer.area],
  ] as const;

  const optionalRows = [
    [text.block, customer.block],
    [text.street, customer.street],
    [text.building, customer.building],
    [text.floor, customer.floor],
    [text.apartment, customer.apartment],
    [text.notes, customer.notes],
  ] as const;

  const deliverySlotValue =
    deliverySlot?.date && deliverySlot?.window
      ? formatSlot(
          {
            date: deliverySlot.date,
            window: deliverySlot.window as DeliverySlot["window"],
          },
          lang
        )
      : "";
  const paymentLogo = details.paymentMethod === "knet" ? knetLogo : visaLogo;

  const modal = (
    <section
      ref={modalRef}
      data-testid="checkout-confirm-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-confirm-title"
      dir={isArabic ? "rtl" : "ltr"}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm"
      onClick={event => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-2xl bg-card p-4 font-cairo text-foreground shadow-2xl sm:max-w-md"
        onClick={event => event.stopPropagation()}
      >
        <header className="-mx-4 flex items-center justify-between gap-3 border-b border-border/30 px-4 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck
              className="h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <h2
              id="checkout-confirm-title"
              className="truncate text-sm font-black"
            >
              {text.title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              if (!pending) onClose();
            }}
            disabled={pending}
            aria-label={isArabic ? "إغلاق" : "Close"}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-3 pt-4">
          <section aria-labelledby="confirmation-delivery-heading">
            <h3
              id="confirmation-delivery-heading"
              className="mb-2 flex items-center gap-1.5 text-xs font-bold"
            >
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              {text.deliveryInfo}
            </h3>
            <div className="space-y-1.5 rounded-xl bg-muted/20 p-3 text-xs">
              {requiredRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="shrink-0 text-muted-foreground">
                    {label}
                  </span>
                  <span className="min-w-0 break-words text-left font-bold">
                    {hasValue(value) ? value : text.missing}
                  </span>
                </div>
              ))}
              {optionalRows.map(([label, value]) =>
                hasValue(value) ? (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {label}
                    </span>
                    <span className="min-w-0 break-words text-left font-bold">
                      {value}
                    </span>
                  </div>
                ) : null
              )}
              {deliverySlotValue ? (
                <div className="flex items-start justify-between gap-3 border-t border-slate-200/70 pt-2 text-xs">
                  <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {text.deliverySlot}
                  </span>
                  <span className="text-left font-semibold">
                    {deliverySlotValue}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <section
            data-testid="confirmation-products"
            aria-labelledby="confirmation-products-heading"
          >
            <h3
              id="confirmation-products-heading"
              className="mb-2 flex items-center gap-1.5 text-xs font-bold"
            >
              <Package className="h-4 w-4 text-primary" aria-hidden="true" />
              {text.products} ({details.lines.length})
            </h3>
            <div className="space-y-1 rounded-xl bg-muted/20 px-3">
              {details.lines.length ? (
                details.lines.map(line => (
                  <div
                    key={line.key}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {line.name}{" "}
                        <span className="font-normal text-muted-foreground">
                          × {line.quantity}
                        </span>
                      </p>
                      {line.preparations.length ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {line.preparations.join("، ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-left">
                      {line.originalTotal !== null ? (
                        <p className="text-xs text-slate-400 line-through">
                          {money(line.originalTotal, lang)}
                        </p>
                      ) : null}
                      <p className="font-bold text-primary">
                        {money(line.lineTotal, lang)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-3 text-sm text-muted-foreground">
                  {isArabic ? "لا توجد منتجات" : "No products"}
                </p>
              )}
            </div>
          </section>

          <section
            data-testid="confirmation-payment"
            aria-labelledby="confirmation-payment-heading"
          >
            <h3
              id="confirmation-payment-heading"
              className="mb-2 flex items-center gap-1.5 text-xs font-bold"
            >
              <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
              {text.payment}
            </h3>
            <div className="flex items-center gap-2 rounded-xl bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <img
                  src={paymentLogo}
                  alt={details.paymentMethod === "knet" ? "KNET" : "Visa"}
                  className="h-7 w-auto max-w-[76px] object-contain"
                />
                {details.paymentMethod === "card" ? (
                  <img
                    src={mastercardLogo}
                    alt="Mastercard"
                    className="h-7 w-auto max-w-[48px] object-contain"
                  />
                ) : null}
              </div>
              <span className="text-xs font-semibold">
                {details.paymentMethod === "knet" ? text.knet : text.card}
              </span>
            </div>
          </section>

          <section
            aria-label={isArabic ? "ملخص الطلب" : "Order summary"}
            className="space-y-1.5 border-t border-border/30 pt-3 text-xs"
          >
            <div
              data-testid="confirmation-subtotal"
              className="flex items-center justify-between gap-3"
            >
              <span className="text-muted-foreground">{text.subtotal}</span>
              <span className="font-semibold">
                {money(details.totals.baseSubtotal, lang)}
              </span>
            </div>
            <div
              data-testid="confirmation-discount"
              className="flex items-center justify-between gap-3"
            >
              <span className="text-muted-foreground">
                {text.campaignDiscount}
              </span>
              <span className="font-semibold text-emerald-500">
                -{money(details.totals.campaignDiscount, lang)}
              </span>
            </div>
            {details.totals.couponDiscount !== 0 ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {text.couponDiscount}
                </span>
                <span className="font-semibold text-primary">
                  -{money(details.totals.couponDiscount, lang)}
                </span>
              </div>
            ) : null}
            {details.totals.preparationFees !== 0 ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {text.preparationFees}
                </span>
                <span className="font-semibold">
                  {money(details.totals.preparationFees, lang)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{text.shipping}</span>
              <span
                className={
                  details.totals.deliveryFee === 0
                    ? "font-semibold text-emerald-500"
                    : "font-semibold"
                }
              >
                {details.totals.deliveryFee === 0
                  ? text.free
                  : money(details.totals.deliveryFee, lang)}
              </span>
            </div>
            <div
              data-testid="confirmation-total"
              className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-base font-bold"
            >
              <span>{text.total}</span>
              <span className="text-primary">
                {money(details.totals.total, lang)}
              </span>
            </div>
          </section>

          <div className="space-y-2 text-xs" aria-live="polite">
            <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>{text.paymentNotice}</span>
            </p>
            {!serverReady ? (
              <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{text.offline}</span>
              </p>
            ) : null}
            {validationError ? (
              <p
                role="alert"
                className="flex items-start gap-1.5 rounded-lg bg-red-50 p-2 font-semibold text-red-700"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{validationError}</span>
              </p>
            ) : null}
          </div>

          <footer className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (!pending) onClose();
              }}
              disabled={pending}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {text.edit}
            </button>
            <button
              type="button"
              data-testid="checkout-confirm-send"
              onClick={onConfirm}
              disabled={!canSend || pending}
              className="flex-[2] rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                {pending ? (
                  <Clock3
                    className="h-4 w-4 animate-pulse"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                {text.confirm}
              </span>
            </button>
          </footer>
        </div>
      </div>
    </section>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

export { CheckoutConfirmationModal };
