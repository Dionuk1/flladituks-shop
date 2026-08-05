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

/** Deterministic pseudo-barcode bars derived from the order code. */
function BarcodePlaceholder({ code }: { code: string }) {
  const bars = Array.from({ length: 48 }, (_, i) => {
    const seed = code.charCodeAt(i % code.length) + i * 7;
    return (seed % 3) + 1;
  });
  return (
    <div className="flex h-10 items-end gap-[2px]" aria-label={`Barkod ${code}`}>
      {bars.map((w, i) => (
        <span
          key={i}
          className="h-full bg-foreground"
          style={{ width: `${w}px` }}
        />
      ))}
    </div>
  );
}

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

  const code = formatOrderNo(order.order_no, order.id);

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
          <DialogTitle>Etiketa e Dërgesës (10×15 cm)</DialogTitle>
        </DialogHeader>

        <div
          id="shipping-slip"
          className="mx-auto w-full max-w-[100mm] rounded-xl border-2 border-foreground bg-card p-4 text-foreground"
        >
          <div className="flex items-start justify-between gap-2 border-b-2 border-foreground pb-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Dërguesi
              </p>
              <p className="text-sm font-black leading-tight">FlladituKS</p>
              <p className="text-[10px] leading-tight text-muted-foreground">
                Prishtinë, Kosovë · info@flladituks
              </p>
            </div>
            <p className="shrink-0 font-mono text-xl font-black">{code}</p>
          </div>

          <div className="mt-2 flex flex-col items-center border-b border-dashed pb-2">
            <BarcodePlaceholder code={code} />
            <p className="mt-1 font-mono text-[10px] tracking-[0.3em]">{code}</p>
          </div>

          <div className="mt-2 space-y-0.5 text-sm">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Marrësi
            </p>
            <p className="text-base font-bold leading-tight">{order.customer_name}</p>
            <p className="font-semibold">{order.phone}</p>
            <p className="leading-tight">{order.address}</p>
            <p className="font-semibold">
              {[order.city, order.country || "Kosovë"].filter(Boolean).join(", ")}
            </p>
          </div>

          <div className="mt-2 border-t pt-2">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Produktet
            </p>
            <ul className="space-y-0.5 text-xs">
              {order.items.length === 0 && <li className="text-muted-foreground">—</li>}
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="truncate">
                    {it.quantity}× {it.title}
                  </span>
                  <span className="shrink-0">{formatPrice(it.price * it.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-2 flex items-center justify-between border-t-2 border-foreground pt-2">
            <span className="text-xs font-bold uppercase">
              Për t'u arkëtuar
              <span className="block text-[10px] font-normal normal-case text-muted-foreground">
                Pagesa në Dorëzim (COD)
              </span>
            </span>
            <span className="text-2xl font-black">{formatPrice(order.total)}</span>
          </div>
        </div>

        <Button onClick={print} className="w-full rounded-full print:hidden">
          <Printer className="mr-2 h-4 w-4" /> Printo Etiketën
        </Button>
      </DialogContent>
    </Dialog>
  );
}
