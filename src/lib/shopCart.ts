import { create } from "zustand";

export interface ShopCartItem {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel?: string | null;
  price: number;
  imageUrl?: string | null;
  qty: number;
  maxQty: number;
}

const keyOf = (i: { productId: string; variantId: string | null }) =>
  `${i.productId}::${i.variantId || ""}`;

interface State {
  items: ShopCartItem[];
  add: (item: ShopCartItem) => void;
  remove: (productId: string, variantId: string | null) => void;
  setQty: (productId: string, variantId: string | null, qty: number) => void;
  clear: () => void;
}

const KEY = "prive_shop_cart_v1";
function load(): ShopCartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(items: ShopCartItem[]) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
}

export const useShopCart = create<State>((set, get) => ({
  items: load(),
  add: (item) => {
    const list = [...get().items];
    const idx = list.findIndex((i) => keyOf(i) === keyOf(item));
    if (idx >= 0) list[idx] = { ...list[idx], qty: Math.min(list[idx].maxQty, list[idx].qty + item.qty) };
    else list.push(item);
    save(list); set({ items: list });
  },
  remove: (productId, variantId) => {
    const list = get().items.filter((i) => keyOf(i) !== keyOf({ productId, variantId }));
    save(list); set({ items: list });
  },
  setQty: (productId, variantId, qty) => {
    const list = get().items.map((i) =>
      keyOf(i) === keyOf({ productId, variantId })
        ? { ...i, qty: Math.max(1, Math.min(i.maxQty, qty)) }
        : i
    );
    save(list); set({ items: list });
  },
  clear: () => { save([]); set({ items: [] }); },
}));
