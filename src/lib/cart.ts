import { create } from "zustand";

// lightweight cart per event held in localStorage
export interface CartItem {
  eventProductId: string;
  productId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  qty: number;
  maxQty: number;
}

interface State {
  items: Record<string, CartItem[]>; // keyed by eventId
  add: (eventId: string, item: CartItem) => void;
  remove: (eventId: string, eventProductId: string) => void;
  setQty: (eventId: string, eventProductId: string, qty: number) => void;
  clear: (eventId: string) => void;
}

const KEY = "prive_cart_v1";
function load(): Record<string, CartItem[]> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function save(s: Record<string, CartItem[]>) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(s));
}

export const useCart = create<State>((set, get) => ({
  items: load(),
  add: (eventId, item) => {
    const all = { ...get().items };
    const list = all[eventId] || [];
    const idx = list.findIndex((i) => i.eventProductId === item.eventProductId);
    if (idx >= 0) list[idx] = { ...list[idx], qty: Math.min(list[idx].maxQty, list[idx].qty + item.qty) };
    else list.push(item);
    all[eventId] = list;
    save(all);
    set({ items: all });
  },
  remove: (eventId, epid) => {
    const all = { ...get().items };
    all[eventId] = (all[eventId] || []).filter((i) => i.eventProductId !== epid);
    save(all); set({ items: all });
  },
  setQty: (eventId, epid, qty) => {
    const all = { ...get().items };
    all[eventId] = (all[eventId] || []).map((i) => i.eventProductId === epid ? { ...i, qty: Math.max(1, Math.min(i.maxQty, qty)) } : i);
    save(all); set({ items: all });
  },
  clear: (eventId) => {
    const all = { ...get().items };
    delete all[eventId];
    save(all); set({ items: all });
  },
}));
