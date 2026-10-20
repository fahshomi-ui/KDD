import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Package, Send, User } from "lucide-react";
import Layout from "@/kdd/components/Layout";
import { ErrorState } from "@/kdd/components/CatalogState";
import { useLanguage } from "@/kdd/contexts/LanguageContext";
import { cartLineKey, useCart } from "@/kdd/contexts/CartContext";
import { createOrder, useConnectionStatus } from "@/kdd/hooks/useStore";
import type { OrderDraft, OrderReceipt } from "@/kdd/lib/types";
import { newRequestId } from "@/kdd/lib/storeUtils";
import checkoutHero from "@/kdd/assets/checkout-hero.jpg";

type CustomerForm = {
  name: string;
  phone: string;
  area: string;
  block: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  notes: string;
};
const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  area: "",
  block: "",
  street: "",
  building: "",
  floor: "",
  apartment: "",
  notes: "",
};
export default function Checkout() {
  const { lang, t } = useLanguage();
  const {
    items,
    subtotal,
    discount,
    couponCode,
    deliveryFee,
    preparationFees,
    total,
    clearCart,
  } = useCart();
  const connection = useConnectionStatus();
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryWindow, setDeliveryWindow] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const stableRequestId = useRef(newRequestId());
  const connectionLoading = connection === "connecting";
  const serverReady = connection === "connected";
  const update = (field: keyof CustomerForm, value: string) =>
    setForm(current => ({ ...current, [field]: value }));
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setError("");
    if (!serverReady) {
      setError(
        lang === "ar"
          ? "الخادم غير مهيأ لاستقبال الطلبات حالياً. لم يتم إرسال أي بيانات."
          : "The order service is not configured. No data was sent."
      );
      return;
    }
    if (!items.length) return;
    setPending(true);
    const draft: OrderDraft = {
      requestId: stableRequestId.current,
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        area: form.area.trim(),
        ...(form.block.trim() ? { block: form.block.trim() } : {}),
        ...(form.street.trim() ? { street: form.street.trim() } : {}),
        ...(form.building.trim() ? { building: form.building.trim() } : {}),
        ...(form.floor.trim() ? { floor: form.floor.trim() } : {}),
        ...(form.apartment.trim() ? { apartment: form.apartment.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      },
      items: items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        ...(item.preparations?.length
          ? { preparations: item.preparations }
          : {}),
      })),
      ...(deliveryDate || deliveryWindow
        ? {
            deliverySlot: {
              ...(deliveryDate ? { date: deliveryDate } : {}),
              ...(deliveryWindow ? { window: deliveryWindow } : {}),
            },
          }
        : {}),
      ...(couponCode ? { couponCode } : {}),
    };
    try {
      const result = await createOrder(draft);
      setReceipt(result);
      clearCart();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : lang === "ar"
            ? "تعذر إرسال الطلب. حاول مرة أخرى."
            : "The order could not be sent. Please try again."
      );
    } finally {
      setPending(false);
    }
  };

  if (receipt)
    return (
      <Layout>
        <div className="kdd-container py-16">
          <div className="mx-auto max-w-xl rounded-3xl border border-emerald-300/50 bg-emerald-50 p-7 text-center dark:bg-emerald-950/20">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
            <h1 className="mt-5 text-3xl font-black">
              {lang === "ar" ? "تم استلام طلبك" : "Order received"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {lang === "ar"
                ? "وصل طلبك إلى المتجر وسيتم التعامل معه."
                : "Your order reached the store and will be processed."}
            </p>
            <dl className="mx-auto mt-6 max-w-sm space-y-2 text-start text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {lang === "ar" ? "رقم الطلب" : "Order ID"}
                </dt>
                <dd className="font-bold">{receipt.orderId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {lang === "ar" ? "الحالة" : "Status"}
                </dt>
                <dd className="font-bold text-emerald-700">
                  {receipt.status === "received"
                    ? lang === "ar"
                      ? "مستلم"
                      : "Received"
                    : receipt.status}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {lang === "ar" ? "الإجمالي" : "Total"}
                </dt>
                <dd className="font-bold">
                  {Number(receipt.total).toFixed(3)} {t("products.kwd")}
                </dd>
              </div>
            </dl>
            <Link
              to="/products"
              className="mt-7 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground"
            >
              {lang === "ar" ? "متابعة التسوق" : "Continue shopping"}
            </Link>
          </div>
        </div>
      </Layout>
    );
  if (!items.length)
    return (
      <Layout>
        <div className="kdd-container py-20 text-center">
          <Package className="mx-auto mb-4 h-14 w-14 text-muted-foreground/50" />
          <p className="font-bold">
            {lang === "ar"
              ? "أضف منتجات إلى السلة أولاً."
              : "Add products to the cart first."}
          </p>
          <Link
            to="/products"
            className="mt-5 inline-block text-primary hover:underline"
          >
            {lang === "ar" ? "استعراض المنتجات" : "Browse products"}
          </Link>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <section className="relative isolate overflow-hidden">
        <img
          src={checkoutHero}
          alt=""
          className="absolute inset-0 -z-20 h-56 w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-background/95 via-background/80 to-background/20" />
        <div className="kdd-container flex h-56 flex-col justify-center">
          <h1 className="text-3xl font-black md:text-5xl">
            {lang === "ar" ? "إرسال الطلب" : "Send order"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "ar"
              ? "أدخل بيانات التوصيل ثم أرسل الطلب إلى المتجر."
              : "Enter delivery details, then send the order to the store."}
          </p>
        </div>
      </section>
      <div className="kdd-container py-7">
        <div className="mb-5 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
          {connectionLoading
            ? lang === "ar"
              ? "جارٍ التحقق من اتصال خدمة الطلب..."
              : "Checking the order service connection..."
            : serverReady
              ? lang === "ar"
                ? "خدمة الطلب متاحة. لن تُرسل بياناتك إلا عند الضغط على إرسال الطلب."
                : "The order service is available. Your details are sent only when you submit."
              : lang === "ar"
                ? "خدمة الطلب غير مهيأة حالياً. لن يتم إرسال أي بيانات."
                : "The order service is not configured. No data will be sent."}
        </div>
        {error && (
          <div className="mb-5">
            <ErrorState message={error} />
          </div>
        )}
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-black">
                <User className="h-5 w-5 text-primary" />
                {t("checkout.deliveryInfo")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  required
                  label={t("checkout.name")}
                  value={form.name}
                  onChange={value => update("name", value)}
                />
                <Field
                  required
                  label={t("checkout.phone")}
                  value={form.phone}
                  onChange={value => update("phone", value)}
                  type="tel"
                  dir="ltr"
                />
                <Field
                  required
                  label={t("checkout.area")}
                  value={form.area}
                  onChange={value => update("area", value)}
                />
                <Field
                  label={t("checkout.block")}
                  value={form.block}
                  onChange={value => update("block", value)}
                />
                <Field
                  label={t("checkout.street")}
                  value={form.street}
                  onChange={value => update("street", value)}
                />
                <Field
                  label={t("checkout.building")}
                  value={form.building}
                  onChange={value => update("building", value)}
                />
                <Field
                  label={t("checkout.floor")}
                  value={form.floor}
                  onChange={value => update("floor", value)}
                />
                <Field
                  label={t("checkout.apartment")}
                  value={form.apartment}
                  onChange={value => update("apartment", value)}
                />
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-sm font-bold">
                    {t("checkout.notes")}
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={event => update("notes", event.target.value)}
                    className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-primary"
                  />
                </label>
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-black">
                <Clock className="h-5 w-5 text-primary" />
                {lang === "ar"
                  ? "موعد التوصيل (اختياري)"
                  : "Delivery time (optional)"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-sm font-bold">
                    {lang === "ar" ? "التاريخ" : "Date"}
                  </span>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={event => setDeliveryDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-bold">
                    {lang === "ar" ? "الفترة" : "Window"}
                  </span>
                  <select
                    value={deliveryWindow}
                    onChange={event => setDeliveryWindow(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3"
                  >
                    <option value="">
                      {lang === "ar" ? "اختر الفترة" : "Select a window"}
                    </option>
                    <option value="morning">
                      {lang === "ar" ? "صباحاً" : "Morning"}
                    </option>
                    <option value="afternoon">
                      {lang === "ar" ? "ظهراً" : "Afternoon"}
                    </option>
                    <option value="evening">
                      {lang === "ar" ? "مساءً" : "Evening"}
                    </option>
                  </select>
                </label>
              </div>
            </section>
          </div>
          <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
              <Package className="h-5 w-5 text-primary" />
              {t("checkout.orderSummary")}
            </h2>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {items.map(item => (
                <div
                  key={cartLineKey(item)}
                  className="flex justify-between gap-2 text-sm"
                >
                  <span className="truncate">
                    {lang === "ar"
                      ? (item.product as any).name_ar
                      : (item.product as any).name_en}{" "}
                    ×{item.quantity}
                  </span>
                  <span className="font-bold">
                    {(
                      Number((item.product as any).price || 0) * item.quantity
                    ).toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("cart.subtotal")}
                </span>
                <strong>{subtotal.toFixed(3)}</strong>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("cart.discount")}
                  </span>
                  <strong>-{discount.toFixed(3)}</strong>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {lang === "ar" ? "التحضير" : "Preparation"}
                </span>
                <strong>{preparationFees.toFixed(3)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("cart.delivery")}
                </span>
                <strong>{deliveryFee.toFixed(3)}</strong>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-lg">
                <span className="font-black">{t("cart.total")}</span>
                <strong className="text-primary">
                  {total.toFixed(3)} {t("products.kwd")}
                </strong>
              </div>
            </div>
            <button
              type="submit"
              disabled={pending || connectionLoading || !serverReady}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {pending
                ? lang === "ar"
                  ? "جارٍ الإرسال..."
                  : "Sending..."
                : lang === "ar"
                  ? "إرسال الطلب"
                  : "Send order"}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {lang === "ar"
                ? `${itemCount} منتجات في الطلب`
                : `${itemCount} items in this order`}
            </p>
          </aside>
        </form>
      </div>
    </Layout>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      <input
        required={required}
        type={type}
        dir={dir}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
      />
    </label>
  );
}
