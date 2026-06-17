import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Clock, CheckCircle2, PlusCircle, FileSpreadsheet, Flame } from "lucide-react";
import { adminStats, adminListOrders, adminTopSelling } from "@/lib/admin.functions";
import { requireToken } from "@/lib/admin-auth";
import { formatPrice, statusLabel } from "@/lib/cities";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminStats({ data: { token: requireToken() } }),
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: () => adminListOrders({ data: { token: requireToken(), limit: 5 } }),
  });

  const cards = [
    { label: "Produkte", value: stats?.products ?? 0, icon: Package, color: "bg-primary/10 text-primary" },
    { label: "Porosi gjithsej", value: stats?.orders ?? 0, icon: ShoppingBag, color: "bg-accent text-accent-foreground" },
    { label: "Porosi të reja", value: stats?.newOrders ?? 0, icon: Clock, color: "bg-warning/15 text-warning-foreground" },
    { label: "Të ardhura", value: formatPrice(stats?.revenue ?? 0), icon: CheckCircle2, color: "bg-success/15 text-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Përmbledhje</h1>
        <p className="text-sm text-muted-foreground">Mirë se erdhe në panelin e FlladituKS.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${c.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-xl font-bold">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Link
          to="/admin/shto"
          className="group flex items-center justify-between rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary hover:shadow-md"
        >
          <div>
            <p className="font-semibold">Shto Produkt të Ri</p>
            <p className="text-sm text-muted-foreground">Krijo listim si në Marketplace</p>
          </div>
          <PlusCircle className="h-8 w-8 text-primary transition group-hover:scale-110" />
        </Link>
        <Link
          to="/admin/importo"
          className="group flex items-center justify-between rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary hover:shadow-md"
        >
          <div>
            <p className="font-semibold">Importo nga Excel</p>
            <p className="text-sm text-muted-foreground">Ngarko produkte në masë</p>
          </div>
          <FileSpreadsheet className="h-8 w-8 text-primary transition group-hover:scale-110" />
        </Link>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Porositë e fundit</h2>
          <Link to="/admin/porosite" className="text-sm text-primary hover:underline">
            Shiko të gjitha →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Ende pa porosi.</p>
        ) : (
          <ul className="divide-y">
            {recent.map((o: any) => (
              <li key={o.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.city} · {new Date(o.created_at).toLocaleString("sq")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{formatPrice(o.total)}</p>
                  <p className="text-xs text-muted-foreground">{statusLabel(o.status)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
