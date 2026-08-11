import { useState } from "react";
import { Minus, Plus, Trash2, X, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/cities";
import { CheckoutForm } from "./checkout-form";
import { useI18n } from "@/lib/i18n";

export function CartDrawer() {
  const { items, open, setOpen, remove, updateQty, total, count } = useCart();
  const [checkout, setCheckout] = useState(false);
  const { t } = useI18n();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 animate-fade-in bg-foreground/40 backdrop-blur-md"
        onClick={() => {
          setOpen(false);
          setCheckout(false);
        }}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-2xl animate-slide-in-right">
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {checkout ? t("cart.finish") : `${t("nav.cart")} (${count})`}
            </h2>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              setCheckout(false);
            }}
            className="rounded-full p-1 hover:bg-secondary"
            aria-label="Mbyll"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {checkout ? (
          <CheckoutForm onBack={() => setCheckout(false)} onDone={() => setOpen(false)} />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              {items.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-muted-foreground">
                  <div>
                    <ShoppingBag className="mx-auto h-10 w-10 opacity-40" />
                    <p className="mt-3">{t("cart.empty")}</p>
                  </div>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="flex gap-3 rounded-xl border bg-card p-3"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {it.image_url && (
                          <img
                            src={it.image_url}
                            alt={it.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-medium">{it.title}</p>
                          <button
                            onClick={() => remove(it.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Hiq"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-full border">
                            <button
                              onClick={() => updateQty(it.id, it.quantity - 1)}
                              className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm">{it.quantity}</span>
                            <button
                              onClick={() => updateQty(it.id, it.quantity + 1)}
                              className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="font-semibold text-primary">
                            {formatPrice(it.price * it.quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="border-t bg-card p-5">
              <div className="mb-3 flex items-center justify-between text-base">
                <span className="text-muted-foreground">{t("cart.total")}</span>
                <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
              </div>
              <Button
                className="w-full rounded-full transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                size="lg"
                disabled={items.length === 0}
                onClick={() => setCheckout(true)}
              >
                {t("cart.checkout")}
              </Button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
