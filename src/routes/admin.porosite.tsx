import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2, Phone, MapPin, Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ORDER_STATUSES, formatPrice, statusLabel, type OrderStatus } from "@/lib/cities";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/porosite")({
  component: OrdersPage,
});

type Order = {
  id: string;
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  items: Array<{ id: string; title: string; price: number; quantity: number }>;
  total: number;
  status: OrderStatus | string;
  notes: string | null;
  created_at: string;
};

function OrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error("Gabim", { description: error.message });
    else {
      toast.success("Statusi u përditësua");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-orders"] });
    }
  }

  async function deleteOrder(id: string) {
    if (!confirm("Të fshihet kjo porosi?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) toast.error("Gabim", { description: error.message });
    else {
      toast.success("Porosia u fshi");
      qc.invalidateQueries({ queryKey: ["orders"] });
    }
  }

  function copyForPost(o: Order) {
    const text = `Emri: ${o.customer_name} | Tel: ${o.phone} | Qyteti: ${o.city} | Adresa: ${o.address} | Totali: ${formatPrice(o.total)} | Pagesa: në dorë`;
    navigator.clipboard.writeText(text).then(
      () => toast.success("U kopjua për postën"),
      () => toast.error("Kopjimi dështoi"),
    );
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of ORDER_STATUSES) c[s.value] = orders.filter((o) => o.status === s.value).length;
    return c;
  }, [orders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Porositë</h1>
        <p className="text-sm text-muted-foreground">
          Të gjitha porositë live nga databaza.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>
          Të gjitha
        </FilterChip>
        {ORDER_STATUSES.map((s) => (
          <FilterChip
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
            count={counts[s.value] ?? 0}
          >
            {s.label}
          </FilterChip>
        ))}
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          Ende pa porosi në këtë status.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => (
            <li key={o.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{o.customer_name}</h3>
                    <Badge variant="outline" className="rounded-full text-xs">
                      {statusLabel(o.status)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {o.phone}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {o.city} · {o.address}
                    </span>
                    <span>{new Date(o.created_at).toLocaleString("sq")}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{formatPrice(o.total)}</p>
                  <p className="text-xs text-muted-foreground">Pagesa në dorë</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-secondary/40 p-3">
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Package2 className="h-3.5 w-3.5" /> Artikujt
                </p>
                <ul className="space-y-1 text-sm">
                  {o.items?.map((it, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {it.quantity}× {it.title}
                      </span>
                      <span className="text-muted-foreground">
                        {formatPrice(it.price * it.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                {o.notes && (
                  <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                    Shënim: {o.notes}
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyForPost(o)}
                  className="rounded-full"
                >
                  <Copy className="mr-1 h-4 w-4" /> Kopjo për Postën
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteOrder(o.id)}
                  className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Fshij
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:bg-secondary"
      }`}
    >
      {children}
      <span
        className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] ${
          active ? "bg-primary-foreground/20" : "bg-secondary"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
