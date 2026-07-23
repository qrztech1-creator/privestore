import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

interface FavoritesState {
  favorites: Set<string>;
  init: (userId?: string | null) => Promise<void>;
  toggle: (productId: string, userId?: string | null) => Promise<void>;
  isFavorite: (productId: string) => boolean;
}

const KEY = "prive_shop_favorites_v1";

function loadLocal(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveLocal(favSet: Set<string>) {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(Array.from(favSet)));
  }
}

export const useFavorites = create<FavoritesState>((set, get) => ({
  favorites: loadLocal(),

  init: async (userId?: string | null) => {
    const localSet = loadLocal();
    if (!userId) {
      set({ favorites: localSet });
      return;
    }

    try {
      const { data: dbFavs } = await supabase
        .from("shop_favorites")
        .select("product_id")
        .eq("user_id", userId);

      const combined = new Set(localSet);
      if (dbFavs && dbFavs.length > 0) {
        dbFavs.forEach((f: any) => combined.add(f.product_id));
      }

      saveLocal(combined);
      set({ favorites: combined });

      const dbSet = new Set((dbFavs ?? []).map((f: any) => f.product_id));
      const missingInDb = Array.from(localSet).filter((pid) => !dbSet.has(pid));

      if (missingInDb.length > 0) {
        await supabase.from("shop_favorites").insert(
          missingInDb.map((product_id) => ({
            user_id: userId,
            product_id,
          }))
        );
      }
    } catch (err) {
      console.error("Erro ao sincronizar favoritos:", err);
      set({ favorites: localSet });
    }
  },

  toggle: async (productId: string, userId?: string | null) => {
    const current = new Set(get().favorites);
    const has = current.has(productId);

    if (has) {
      current.delete(productId);
    } else {
      current.add(productId);
    }

    saveLocal(current);
    set({ favorites: new Set(current) });

    if (userId) {
      if (has) {
        await supabase
          .from("shop_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", productId);
      } else {
        await supabase
          .from("shop_favorites")
          .insert({ user_id: userId, product_id: productId });
      }
    }
  },

  isFavorite: (productId: string) => {
    return get().favorites.has(productId);
  },
}));
