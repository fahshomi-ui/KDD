import { io, type Socket } from "socket.io-client";
import type { CartSnapshot, Catalog, OrderDraft, OrderReceipt } from "./types";

export type ConnectionStatus =
  | "not-configured"
  | "connecting"
  | "connected"
  | "disconnected";
type Ack<T> = { ok: true; data: T } | { ok: false; error: string };
const rawUrl = import.meta.env.VITE_KDD_SOCKET_URL?.trim();
const endpoint = rawUrl || null;
let socket: Socket | null = null;
let status: ConnectionStatus = endpoint ? "connecting" : "not-configured";
const subscribers = new Set<() => void>();
const catalogSubscribers = new Set<() => void>();
let latestCart: { items: OrderDraft["items"] } | null = null;
let cartTimer: ReturnType<typeof setTimeout> | null = null;

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
export const submitOrder = (draft: OrderDraft) =>
  request<OrderReceipt>("kdd:order:create", draft);

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
