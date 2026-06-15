import { ShoppingCart, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/cities";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  condition: string | null;
  stock: number;
  status: string;
  shipping_cost?: number | null;
};

export function ProductCard({ product }: { product: Product }) {
  const { add, setOpen } = useCart();
  const sold = product.status === "sold";
  const available = !sold && product.stock > 0 && product.status === "available";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
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

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold">{product.title}</h3>
        {product.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-lg font-bold text-primary">{formatPrice(product.price)}</p>
            <p className="text-xs text-muted-foreground">
              {sold ? "E shitur" : available ? `${product.stock} në stok` : "I padisponueshëm"}
            </p>
          </div>
          <Button
            size="sm"
            disabled={!available}
            onClick={() => {
              add({
                id: product.id,
                title: product.title,
                price: Number(product.price),
                image_url: product.image_url,
              });
              toast.success("U shtua në shportë", { description: product.title });
              setOpen(true);
            }}
            className="rounded-full"
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            {sold ? "Nuk ka stok" : "Shto"}
          </Button>
        </div>
      </div>
    </div>
  );
}
