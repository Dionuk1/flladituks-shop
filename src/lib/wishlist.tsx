import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "flladituks_wishlist";

type WishlistContextValue = {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  ready: boolean;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const loadRemote = useCallback(async (uid: string) => {
    const { data } = await supabase.from("wishlist").select("product_id").eq("user_id", uid);
    setIds((data ?? []).map((r) => r.product_id as string));
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    setIds(readLocal());
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) void loadRemote(uid);
      else setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) void loadRemote(uid);
      else setIds(readLocal());
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadRemote]);

  const toggle = useCallback(
    async (productId: string) => {
      const isSaved = ids.includes(productId);
      const next = isSaved ? ids.filter((i) => i !== productId) : [...ids, productId];
      setIds(next); // optimistic — heart flips immediately
      if (!userId) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return;
      }
      if (isSaved) {
        await supabase.from("wishlist").delete().eq("user_id", userId).eq("product_id", productId);
      } else {
        await supabase
          .from("wishlist")
          .upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id" });
      }
    },
    [ids, userId],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({ ids, ready, has: (id: string) => ids.includes(id), toggle }),
    [ids, ready, toggle],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
