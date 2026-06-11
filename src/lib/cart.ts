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
  variantId?: string | null;
  variantLabel?: string | null;
}

// Composite key so same item with different cor/tamanho coexists
const keyOf = (i: { eventProductId: string; variantId?: string | null }) =>
  `${i.eventProductId}::${i.variantId || ""}`;

interface State {
  items: Record<string, CartItem[]>; // keyed by eventId
  add: (eventId: string, item: CartItem) => void;
  remove: (eventId: string, eventProductId: string, variantId?: string | null) => void;
  setQty: (eventId: string, eventProductId: string, qty: number, variantId?: string | null) => void;
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
    const idx = list.findIndex((i) => keyOf(i) === keyOf(item));
    if (idx >= 0) list[idx] = { ...list[idx], qty: Math.min(list[idx].maxQty, list[idx].qty + item.qty) };
    else list.push(item);
    all[eventId] = list;
    save(all);
    set({ items: all });
  },
  remove: (eventId, epid, variantId = null) => {
    const all = { ...get().items };
    all[eventId] = (all[eventId] || []).filter((i) => keyOf(i) !== keyOf({ eventProductId: epid, variantId }));
    save(all); set({ items: all });
  },
  setQty: (eventId, epid, qty, variantId = null) => {
    const all = { ...get().items };
    all[eventId] = (all[eventId] || []).map((i) =>
      keyOf(i) === keyOf({ eventProductId: epid, variantId })
        ? { ...i, qty: Math.max(1, Math.min(i.maxQty, qty)) }
        : i
    );
    save(all); set({ items: all });
  },
  clear: (eventId) => {
    const all = { ...get().items };
    delete all[eventId];
    save(all); set({ items: all });
  },
}));
