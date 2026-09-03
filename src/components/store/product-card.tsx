import { useState } from "react";
import {
  ShoppingCart,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  MapPin,
  Truck,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/cities";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  old_price?: number | null;
  image_url: string | null;
  images?: string[] | null;
  category: string | null;
  condition: string | null;
  stock: number;
  status: string;
  shipping_cost?: number | null;
};

function getGallery(product: Product): string[] {
  const arr = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  if (arr.length) return arr.slice(0, 3);
  return product.image_url ? [product.image_url] : [];
}

export function discountPercent(price: number, oldPrice?: number | null): number | null {
  const p = Number(price);
  const o = Number(oldPrice ?? 0);
  if (!o || o <= p) return null;
  return Math.round(((o - p) / o) * 100);
}

function stockUrgency(stock: number): string | null {
  if (stock <= 0) return null;
  if (stock === 1) return "🔥 Vetëm 1 në stok — Porosit tani!";
  if (stock <= 3) return `🔥 Vetëm ${stock} në stok — Porosit tani!`;
  if (stock <= 5) return "🔥 Sasi e kufizuar!";
  return null;
}

export function ProductCard({ product }: { product: Product }) {
  const { add, setOpen, items } = useCart();
  const { t } = useI18n();
  const [detailOpen, setDetailOpen] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const sold = product.status === "sold";
  const available = !sold && product.stock > 0 && product.status === "available";
  const gallery = getGallery(product);
  const cover = gallery[0] ?? null;
  const discount = discountPercent(product.price, product.old_price);
  const urgency = available ? stockUrgency(Number(product.stock ?? 0)) : null;

  function handleAdd(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setTimeout(() => setRipple(null), 600);
    }
    const stockNum = Number(product.stock ?? 0);
    const inCart = items.find((i) => i.id === product.id)?.quantity ?? 0;
    if (!available || stockNum <= 0 || inCart >= stockNum) {
      toast.error("Nuk ka më shumë sasi në stok për këtë produkt!");
      return;
    }
    add({
      id: product.id,
      title: product.title,
      price: Number(product.price),
      image_url: cover,
      stock: stockNum,
    });
    toast.success("U shtua në shportë", { description: product.title });
    setOpen(true);
  }

  return (
    <>
      <div
        className="group animate-fade-in flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-lg backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-2xl hover:shadow-[0_28px_60px_-20px_color-mix(in_oklab,var(--primary)_70%,transparent)] sm:flex-row"
        onClick={() => setDetailOpen(true)}
      >
        <div className="relative aspect-square overflow-hidden bg-secondary sm:w-2/5 sm:shrink-0">

          {cover ? (
            <img
              src={cover}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <ImageOff className="h-10 w-10" />
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {product.category && (
              <Badge variant="secondary" className="rounded-full bg-card/90 text-xs">
                {product.category}
              </Badge>
            )}
            {product.condition && (
              <Badge variant="outline" className="rounded-full bg-card/90 text-xs">
                {product.condition}
              </Badge>
            )}
          </div>
          {discount && !sold && (
            <div className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground shadow">
              -{discount}%
            </div>
          )}
          {gallery.length > 1 && (
            <div className="absolute bottom-2 right-2 rounded-full bg-foreground/70 px-2 py-0.5 text-[10px] font-medium text-background">
              +{gallery.length} foto
            </div>
          )}
          {sold ? (
            <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
              <span className="rotate-[-8deg] rounded-md bg-destructive px-4 py-1.5 text-sm font-extrabold tracking-wider text-destructive-foreground shadow-lg">
                E SHITUR
              </span>
            </div>
          ) : !available ? (
            <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
              <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">
                Pa stok
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="line-clamp-2 text-lg font-bold tracking-tight sm:text-xl">{product.title}</h3>
          {urgency && (
            <span className="inline-flex w-fit animate-pulse items-center gap-1 rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive ring-1 ring-destructive/40 shadow-[0_0_18px_-4px_color-mix(in_oklab,var(--destructive)_70%,transparent)]">
              <Flame className="h-3.5 w-3.5" /> {urgency}
            </span>
          )}
          {product.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          )}
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="whitespace-nowrap text-2xl font-extrabold text-primary">
                  {formatPrice(product.price)}
                </span>
                {discount && (
                  <span className="whitespace-nowrap text-xs text-muted-foreground line-through">
                    {formatPrice(product.old_price!)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {sold
                  ? t("product.sold")
                  : available
                    ? `${product.stock} ${t("product.inStock")}`
                    : t("product.unavailable")}
              </p>
            </div>
            <Button
              size="sm"
              disabled={!available}
              onClick={handleAdd}
              className="relative overflow-hidden rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              {ripple && (
                <span
                  className="ripple-dot pointer-events-none absolute h-8 w-8 rounded-full bg-primary-foreground/40"
                  style={{ left: ripple.x - 16, top: ripple.y - 16 }}
                />
              )}
              <ShoppingCart className="mr-1 h-4 w-4" />
              {sold ? t("product.noStock") : t("product.add")}
            </Button>

          </div>
        </div>
      </div>

      <ProductDetailDialog
        product={product}
        gallery={gallery}
        discount={discount}
        available={available}
        sold={sold}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAdd={() => {
          handleAdd();
          setDetailOpen(false);
        }}
      />
    </>
  );
}

function ProductDetailDialog({
  product,
  gallery,
  discount,
  available,
  sold,
  open,
  onOpenChange,
  onAdd,
}: {
  product: Product;
  gallery: string[];
  discount: number | null;
  available: boolean;
  sold: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const total = gallery.length;
  const cur = gallery[idx] ?? null;

  function go(delta: number) {
    if (total === 0) return;
    setIdx((i) => (i + delta + total) % total);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) setIdx(0);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">{product.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Detajet e produktit {product.title}
        </DialogDescription>
        <div className="grid sm:grid-cols-2">
          <div className="relative aspect-square bg-secondary sm:aspect-auto">
            {cur ? (
              <img src={cur} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <ImageOff className="h-12 w-12" />
              </div>
            )}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow hover:bg-background"
                  aria-label="E mëparshme"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow hover:bg-background"
                  aria-label="Tjetra"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      aria-label={`Foto ${i + 1}`}
                      className={`h-2 w-2 rounded-full transition ${
                        i === idx ? "bg-foreground" : "bg-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            {discount && !sold && (
              <div className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground shadow">
                -{discount}%
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap gap-1.5">
              {product.category && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {product.category}
                </Badge>
              )}
              {product.condition && (
                <Badge variant="outline" className="rounded-full text-xs">
                  {product.condition}
                </Badge>
              )}
              {sold && (
                <Badge className="rounded-full bg-destructive text-destructive-foreground">
                  E SHITUR
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold leading-tight">{product.title}</h2>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="whitespace-nowrap text-2xl font-extrabold text-primary">
                {formatPrice(product.price)}
              </span>
              {discount && (
                <span className="whitespace-nowrap text-sm text-muted-foreground line-through">
                  {formatPrice(product.old_price!)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {sold ? "E shitur" : available ? `${product.stock} në stok` : "I padisponueshëm"}
            </p>
            {available && stockUrgency(Number(product.stock ?? 0)) && (
              <span className="inline-flex w-fit animate-pulse items-center gap-1 rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive ring-1 ring-destructive/40 shadow-[0_0_18px_-4px_color-mix(in_oklab,var(--destructive)_70%,transparent)]">
                <Flame className="h-3.5 w-3.5" /> {stockUrgency(Number(product.stock ?? 0))}
              </span>
            )}
            <p className="text-xs text-muted-foreground">
              🚚 Dërgesa në të gjithë Kosovën · Falas mbi 25.00 € · Pagesa në dorëzim
            </p>
            {product.description && (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {product.description}
              </div>
            )}

            {total > 1 && (
              <div className="flex gap-2">
                {gallery.map((u, i) => (
                  <button
                    key={u + i}
                    onClick={() => setIdx(i)}
                    className={`h-14 w-14 overflow-hidden rounded-lg border-2 transition ${
                      i === idx ? "border-primary" : "border-transparent opacity-70"
                    }`}
                  >
                    <img src={u} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Button
                size="lg"
                disabled={!available}
                onClick={onAdd}
                className="w-full rounded-full transition-transform duration-200 hover:scale-[1.02] active:scale-95"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {sold ? "Nuk ka stok" : "Shto në shportë"}
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full rounded-full transition-transform duration-200 hover:scale-[1.02] active:scale-95"
              >
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Përshëndetje! Jam i interesuar për produktin "${product.title}" (${formatPrice(product.price)}).`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Porosit në WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
