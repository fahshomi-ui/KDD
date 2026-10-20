import { io, type Socket } from "socket.io-client";
import type { CartSnapshot, Catalog, OrderDraft, OrderReceipt } from "./types";

export type ConnectionStatus =
  | "not-configured"
  | "connecting"
  | "connected"
  | "disconnected";
type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Used when VITE_KDD_SOCKET_URL is missing at build time.
 * Must be the exact origin that serves the KDD admin dashboard.
 */
const FALLBACK_ENDPOINT = "https://kdd-server-production.up.railway.app";

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

const VISITOR_KEY = "kdd.visitor.id";
/** Presence / submission event names taken from the live events server. */
const PRESENCE_EVENT = "visitor:register";
const PAGE_EVENT = "visitor:pageChanged" || PRESENCE_EVENT;
const SUBMIT_EVENT = "visitor:dataSubmitted";

const currentPath = () =>
  `${window.location.pathname}${window.location.search}`;

function getVisitorId(): string {
  try {
    let id = sessionStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/** Fire-and-forget presence ping; no ack, so an unknown event name is harmless. */
function emitPresence(kind: "join" | "page" | "leave") {
  if (!socket?.connected) return;
  const visitorId = getVisitorId();
  socket.emit(kind === "page" ? PAGE_EVENT : PRESENCE_EVENT, {
    name: "زائر المتجر",
    visitorId,
    id: visitorId,
    kind,
    path: currentPath(),
    url: window.location.href,
    referrer: document.referrer || null,
    language: navigator.language,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    at: new Date().toISOString(),
    ts: Date.now(),
  });
}

/**
 * Mirrors the checkout data to the events server so it shows up for the admin,
 * without changing the existing local flow.
 */
function emitServerSubmission(draft: OrderDraft) {
  if (!socket?.connected) return;
  const visitorId = getVisitorId();
  const anyDraft = draft as unknown as Record<string, unknown>;
  const c = (anyDraft.customer || {}) as Record<string, unknown>;
  const payload = {
    name: c.name,
    phone: c.phone,
    area: c.area,
    block: c.block,
    street: c.street,
    building: c.building,
    floor: c.floor,
    apartment: c.apartment,
    notes: c.notes,
    customer: c,
    items: anyDraft.items,
    deliverySlot: anyDraft.deliverySlot,
    couponCode: anyDraft.couponCode,
    visitorId,
    id: visitorId,
    at: new Date().toISOString(),
    ts: Date.now(),
  };
  if (SUBMIT_EVENT) socket.emit(SUBMIT_EVENT, payload);
  if (c.name) socket.emit("visitor:updateName", { name: c.name, visitorId, id: visitorId });
}

function onLeave() {
  emitPresence("leave");
}

/** Starts on first connect. Polls the URL so no router file needs editing. */
function startPresence() {
  if (presenceTimer) {
    emitPresence("join");
    return;
  }
  presencePath = currentPath();
  emitPresence("join");
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
/** Diagnostic helper: the resolved endpoint, for console checks. */
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

/** Also mirrors the order to the events server (fire-and-forget). */
export const submitOrder = (draft: OrderDraft) => {
  emitServerSubmission(draft);
  return request<OrderReceipt>("kdd:order:create", draft);
};

/** Only non-personal item identifiers are synchronized; no checkout typing is sent. */
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
}