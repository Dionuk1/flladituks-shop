import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Phone, Printer, Package2, ArrowLeft, FileDown, Truck, XCircle } from "lucide-react";
import { getOrderById, cancelOrderByCustomer } from "@/lib/admin.functions";
import { formatPrice, statusLabel } from "@/lib/cities";
import { exportInvoiceToPDF } from "@/lib/exports";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/porosia/$id")({
  component: InvoicePage,
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="text-xl font-bold">Porosia nuk u gjet</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          ← Kthehu te dyqani
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <p>Porosia nuk u gjet.</p>
    </div>
  ),
});

function InvoicePage() {
  const { id } = useParams({ from: "/porosia/$id" });
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderById({ data: { id } }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }
  if (!data) return null;

  const items = (data.items as any[]) ?? [];
  const itemsTotal = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
  const shipping = Number(data.shipping_cost ?? 0);
  const canCancel = ["pending", "new", "processing"].includes(data.status);

  async function handleCancel() {
    if (!confirm("Jeni i sigurt që doni ta anuloni porosinë?")) return;
    setCancelling(true);
    try {
      await cancelOrderByCustomer({ data: { id } });
      toast.success("Porosia juaj u anulua me sukses dhe stoku u lirua!");
      qc.invalidateQueries({ queryKey: ["order", id] });
    } catch (e: any) {
      toast.error("Anulimi dështoi", { description: e?.message });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary/30 py-6 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl px-4 print:max-w-none print:px-0">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Te dyqani
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportInvoiceToPDF(data as any)} className="rounded-full">
              <FileDown className="mr-1 h-4 w-4" /> Shkarko Faturën (PDF)
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-full">
              <Printer className="mr-1 h-4 w-4" /> Printo
            </Button>
          </div>
        </div>



        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm print:shadow-none">
          <div className="gradient-brand p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider opacity-90">FlladituKS · Faturë</p>
                <h1 className="mt-1 text-2xl font-bold">Porosia u krye me sukses!</h1>
                <p className="mt-1 text-sm opacity-90">
                  Faleminderit që zgjodhët FlladituKS. Do t'ju kontaktojmë së shpejti.
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 shrink-0 opacity-90" />
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Numri i porosisë</p>
              <p className="mt-1 break-all font-mono text-sm">{data.id}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Data</p>
              <p className="mt-1 text-sm">{new Date(data.created_at).toLocaleString("sq")}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Statusi</p>
              <p className="mt-1 text-sm font-medium">{statusLabel(data.status)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pagesa</p>
              <p className="mt-1 text-sm">💵 Në dorë (Cash on Delivery)</p>
            </div>
            {data.tracking_number && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Numri i Fletëgarkesës</p>
                <a
                  href={`https://www.postakosoves.com/?s=${encodeURIComponent(data.tracking_number)}`}
                  target="_blank" rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  <Truck className="h-4 w-4" /> {data.tracking_number}
                </a>
              </div>
            )}
          </div>


          <div className="border-t p-6">
            <p className="mb-3 text-sm font-semibold">Të dhënat e dërgesës</p>
            <div className="rounded-xl bg-secondary/40 p-4 text-sm">
              <p className="font-medium">{data.customer_name}</p>
              <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {data.phone}
              </p>
              <p className="mt-1 flex items-start gap-1 text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {data.city} · {data.address}
                </span>
              </p>
              {data.notes && (
                <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                  Shënim: {data.notes}
                </p>
              )}
            </div>
          </div>

          <div className="border-t p-6">
            <p className="mb-3 flex items-center gap-1 text-sm font-semibold">
              <Package2 className="h-4 w-4" /> Produktet e blera
            </p>
            <ul className="divide-y rounded-xl border">
              {items.map((it, i) => (
                <li key={i} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium">{it.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.quantity} × {formatPrice(it.price)}
                    </p>
                  </div>
                  <span className="font-semibold">
                    {formatPrice(Number(it.price) * Number(it.quantity))}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Nëntotali</span>
                <span>{formatPrice(itemsTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Transporti</span>
                <span className={shipping === 0 ? "font-semibold text-success" : ""}>
                  {shipping === 0 ? "Falas" : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-base">
                <span className="font-semibold">Totali</span>
                <span className="text-xl font-bold text-primary">{formatPrice(data.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
