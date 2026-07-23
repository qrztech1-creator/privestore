import { create } from "zustand";

interface RecentlyViewedState {
  ids: string[];
  add: (productId: string) => void;
}

const KEY = "prive_shop_recently_viewed_v1";

function loadLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(ids: string[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(ids));
  }
}

export const useRecentlyViewed = create<RecentlyViewedState>((set, get) => ({
  ids: loadLocal(),
  add: (productId: string) => {
    if (!productId) return;
    const filtered = get().ids.filter((id) => id !== productId);
    const updated = [productId, ...filtered].slice(0, 10);
    saveLocal(updated);
    set({ ids: updated });
  },
}));
