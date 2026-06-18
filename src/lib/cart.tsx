import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

export type CartItem = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  quantity: number;
  stock?: number;
};

type CartContextValue = {
  items: CartItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "flladituks_cart";

const OUT_OF_STOCK_MSG = "Nuk ka më shumë sasi në stok për këtë produkt!";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    return {
      items,
      open,
      setOpen,
      total,
      count,
      add: (item, qty = 1) =>
        setItems((prev) => {
          const stockLimit =
            typeof item.stock === "number" && item.stock >= 0 ? item.stock : Infinity;
          if (stockLimit <= 0) {
            toast.error(OUT_OF_STOCK_MSG);
            return prev;
          }
          const existing = prev.find((p) => p.id === item.id);
          const currentQty = existing?.quantity ?? 0;
          const nextQty = currentQty + qty;
          if (nextQty > stockLimit) {
            toast.error(OUT_OF_STOCK_MSG);
            if (currentQty >= stockLimit) return prev;
            const capped = stockLimit;
            return existing
              ? prev.map((p) => (p.id === item.id ? { ...p, quantity: capped, stock: stockLimit } : p))
              : [...prev, { ...item, quantity: capped, stock: stockLimit }];
          }
          if (existing) {
            return prev.map((p) =>
              p.id === item.id
                ? { ...p, quantity: nextQty, stock: stockLimit === Infinity ? p.stock : stockLimit }
                : p,
            );
          }
          return [
            ...prev,
            { ...item, quantity: qty, stock: stockLimit === Infinity ? undefined : stockLimit },
          ];
        }),
      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      updateQty: (id, qty) =>
        setItems((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const wanted = Math.max(1, qty);
            const limit = typeof p.stock === "number" ? p.stock : Infinity;
            if (wanted > limit) {
              toast.error(OUT_OF_STOCK_MSG);
              return { ...p, quantity: Math.min(limit, p.quantity) };
            }
            return { ...p, quantity: wanted };
          }),
        ),
      clear: () => setItems([]),
    };
  }, [items, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
