import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatOrderNo, formatPrice } from "@/lib/cities";

export type ShippingLabelData = {
  id: string;
  order_no?: number | null;
  customer_name: string;
  phone: string;
  city: string;
  country?: string | null;
  address: string;
  items: Array<{ title: string; quantity: number; price: number }>;
  total: number;
};

export function ShippingLabelDialog({
  order,
  open,
  onOpenChange,
}: {
  order: ShippingLabelData | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!order) return null;

  function print() {
    document.body.classList.add("printing-slip");
    const cleanup = () => {
      document.body.classList.remove("printing-slip");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="print:hidden">
          <DialogTitle>Etiketa e Dërgesës</DialogTitle>
        </DialogHeader>

        <div id="shipping-slip" className="rounded-xl border bg-card p-5 text-foreground">
          <div className="flex items-start justify-between border-b pb-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">FlladituKS</p>
              <p className="text-lg font-bold">Fletëdërgesë</p>
            </div>
            <p className="font-mono text-xl font-bold">
              {formatOrderNo(order.order_no, order.id)}
            </p>
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <p className="text-xs uppercase text-muted-foreground">Marrësi</p>
            <p className="text-base font-semibold">{order.customer_name}</p>
            <p>{order.phone}</p>
            <p>{order.address}</p>
            <p className="font-medium">
              {[order.city, order.country || "Kosovë"].filter(Boolean).join(", ")}
            </p>
          </div>

          <div className="mt-3 border-t pt-3">
            <p className="mb-1 text-xs uppercase text-muted-foreground">Produktet</p>
            <ul className="space-y-0.5 text-sm">
              {order.items.length === 0 && <li className="text-muted-foreground">—</li>}
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {it.quantity}× {it.title}
                  </span>
                  <span>{formatPrice(it.price * it.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="text-sm font-medium">Për t'u arkëtuar (COD)</span>
            <span className="text-xl font-bold">{formatPrice(order.total)}</span>
          </div>
        </div>

        <Button onClick={print} className="w-full rounded-full print:hidden">
          <Printer className="mr-2 h-4 w-4" /> Printo Etiketën
        </Button>
      </DialogContent>
    </Dialog>
  );
}
