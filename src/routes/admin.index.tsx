import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Clock, CheckCircle2, PlusCircle, FileSpreadsheet, Flame, Map as MapIcon, Trophy } from "lucide-react";
import { adminStats, adminListOrders, adminTopSelling, adminCityAnalytics } from "@/lib/admin.functions";
import { KosovoOrdersMap } from "@/components/admin/kosovo-map";
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

  const { data: topSelling = [] } = useQuery({
    queryKey: ["admin-top-selling"],
    queryFn: () => adminTopSelling({ data: { token: requireToken(), limit: 5 } }),
  });



  const { data: cityStats = [] } = useQuery({
    queryKey: ["admin-city-analytics"],
    queryFn: () => adminCityAnalytics({ data: { token: requireToken() } }),
  });

  const topCity = cityStats[0] ?? null;

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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapIcon className="h-4 w-4 text-primary" /> Harta e Porosive
            </h2>
            <span className="text-xs text-muted-foreground">
              Dyqani + porositë private
            </span>
          </div>
          <KosovoOrdersMap stats={cityStats} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold">Qyteti Kryesor</h3>
            </div>
            {topCity ? (
              <>
                <p className="text-2xl font-bold text-primary">{topCity.city}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {topCity.total} porosi · {topCity.delivered} të dorëzuara ·{" "}
                  {formatPrice(topCity.revenue)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Ende pa të dhëna.</p>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-semibold">Top 3 Produktet Më të Shitura</h3>
            </div>
            {topSelling.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ende pa shitje.</p>
            ) : (
              <ol className="space-y-2">
                {topSelling.slice(0, 3).map((p, i) => (
                  <li key={p.id || p.title} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="truncate">{p.title}</span>
                    </span>
                    <span className="shrink-0 font-semibold">{p.quantity} copë</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
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

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Flame className="h-4 w-4 text-orange-500" /> Produktet më të Shitura
          </h2>
          <span className="text-xs text-muted-foreground">vetëm porositë e përfunduara</span>
        </div>
        {topSelling.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Ende pa shitje të përfunduara.
          </p>
        ) : (
          <ul className="divide-y">
            {topSelling.map((p, i) => (
              <li key={p.id || p.title} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="font-medium">{p.title}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{p.quantity} copë</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(p.revenue)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
