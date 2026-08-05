import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Coins, TrendingUp, Truck, Wallet, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { requireToken } from "@/lib/admin-auth";
import { adminListOrders, adminListPrivateOrders } from "@/lib/admin.functions";
import { formatPrice } from "@/lib/cities";
import { Button } from "@/components/ui/button";
import { exportFinancialsToPDF, exportOrdersToExcel } from "@/lib/exports";

export const Route = createFileRoute("/admin/financat")({
  component: FinancePage,
  head: () => ({
    meta: [
      { title: "Financat — Paneli FlladituKS" },
      {
        name: "description",
        content: "Pasqyra financiare e FlladituKS: xhiroja, kostot e postës dhe fitimi neto.",
      },
      { property: "og:title", content: "Financat — Paneli FlladituKS" },
      {
        property: "og:description",
        content: "Pasqyra financiare e FlladituKS: xhiroja, kostot e postës dhe fitimi neto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CONFIRMED = ["processing", "shipped", "completed"];
const MONTHS = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gsh", "Sht", "Tet", "Nën", "Dhj"];

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  icon: any;
  tone?: "default" | "success" | "destructive" | "primary";
  hint?: string;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <p className="min-w-0 truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon className={`h-4 w-4 shrink-0 ${toneClass}`} />
      </div>
      <p className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FinancePage() {
  const [range, setRange] = useState<"30" | "90" | "all">("30");

  const ordersQ = useQuery({
    queryKey: ["admin", "orders", "fin"],
    queryFn: () => adminListOrders({ data: { token: requireToken(), limit: 500 } }),
  });
  const privQ = useQuery({
    queryKey: ["admin", "private", "fin"],
    queryFn: () => adminListPrivateOrders({ data: { token: requireToken() } }),
  });

  const loading = ordersQ.isLoading || privQ.isLoading;

  const data = useMemo(() => {
    const since =
      range === "all" ? 0 : Date.now() - Number(range) * 24 * 60 * 60 * 1000;
    const inRange = (d: string) => new Date(d).getTime() >= since;

    const orders = (ordersQ.data ?? []).filter((o: any) => inRange(o.created_at));
    const privates = (privQ.data ?? []).filter((p: any) => inRange(p.created_at));

    const confirmedOrders = orders.filter((o: any) => CONFIRMED.includes(o.status));
    const confirmedPrivate = privates.filter((p: any) => CONFIRMED.includes(p.status));

    const storeGross = confirmedOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    const storeShipping = confirmedOrders.reduce(
      (s: number, o: any) => s + Number(o.shipping_cost ?? 0),
      0,
    );
    const privGross = confirmedPrivate.reduce(
      (s: number, p: any) => s + Number(p.selling_price ?? 0),
      0,
    );
    const privCost = confirmedPrivate.reduce(
      (s: number, p: any) => s + Number(p.cost_price ?? 0),
      0,
    );
    const privShipping = confirmedPrivate.reduce(
      (s: number, p: any) => s + Number(p.shipping_cost ?? 0),
      0,
    );

    const gross = storeGross + privGross;
    const shippingCosts = storeShipping + privShipping;
    const net = gross - shippingCosts - privCost;

    const pendingCod = orders
      .filter((o: any) => ["processing", "shipped"].includes(o.status))
      .reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);

    const collected = orders
      .filter((o: any) => o.status === "completed")
      .reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);

    const rejected = orders.filter((o: any) =>
      ["rejected", "cancelled"].includes(o.status),
    ).length;
    const rejectRate = orders.length ? (rejected / orders.length) * 100 : 0;

    const count = confirmedOrders.length + confirmedPrivate.length;
    const aov = count ? gross / count : 0;

    // Monthly series
    const byMonth = new Map<string, { label: string; xhiro: number; fitim: number }>();
    const add = (date: string, xhiro: number, fitim: number) => {
      const d = new Date(date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const cur = byMonth.get(key) ?? {
        label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        xhiro: 0,
        fitim: 0,
      };
      cur.xhiro += xhiro;
      cur.fitim += fitim;
      byMonth.set(key, cur);
    };
    for (const o of confirmedOrders)
      add(o.created_at, Number(o.total ?? 0), Number(o.total ?? 0) - Number(o.shipping_cost ?? 0));
    for (const p of confirmedPrivate)
      add(
        p.created_at,
        Number(p.selling_price ?? 0),
        Number(p.selling_price ?? 0) - Number(p.cost_price ?? 0) - Number(p.shipping_cost ?? 0),
      );
    const series = Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => ({
        muaji: v.label,
        Xhiro: Number(v.xhiro.toFixed(2)),
        Fitim: Number(v.fitim.toFixed(2)),
      }));

    const split = [
      { name: "Dyqani online", value: Number(storeGross.toFixed(2)) },
      { name: "Porosi private", value: Number(privGross.toFixed(2)) },
    ].filter((s) => s.value > 0);

    return {
      gross,
      shippingCosts,
      productCosts: privCost,
      net,
      pendingCod,
      collected,
      rejectRate,
      aov,
      count,
      series,
      split,
      orders,
    };
  }, [ordersQ.data, privQ.data, range]);

  if (loading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black sm:text-2xl">Financat</h1>
          <p className="text-sm text-muted-foreground">
            Pasqyra e plotë e të ardhurave nga dyqani dhe porositë private.
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-full bg-secondary p-1">
          {(["30", "90", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                range === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {r === "all" ? "Gjithsej" : `${r} ditë`}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Xhiroja Bruto" value={formatPrice(data.gross)} icon={Coins} tone="primary" />
        <Kpi
          label="Kostot e Postës"
          value={formatPrice(data.shippingCosts)}
          icon={Truck}
          tone="destructive"
        />
        <Kpi
          label="Kostot e Produkteve"
          value={formatPrice(data.productCosts)}
          icon={Wallet}
          tone="destructive"
          hint="Nga porositë private"
        />
        <Kpi label="Fitimi Neto" value={formatPrice(data.net)} icon={TrendingUp} tone="success" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Të arkëtuara (COD)"
          value={formatPrice(data.collected)}
          icon={Wallet}
          tone="success"
        />
        <Kpi
          label="Në pritje arkëtimi"
          value={formatPrice(data.pendingCod)}
          icon={Truck}
          hint="Porosi në proces / të dërguara"
        />
        <Kpi label="Vlera mesatare e porosisë" value={formatPrice(data.aov)} icon={Coins} />
        <Kpi
          label="Norma e kthimeve"
          value={`${data.rejectRate.toFixed(1)}%`}
          icon={TrendingUp}
          tone={data.rejectRate > 15 ? "destructive" : "default"}
          hint={`${data.count} porosi të konfirmuara`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold">Xhiroja dhe fitimi sipas muajve</h2>
          {data.series.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Ende pa të dhëna.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="muaji" fontSize={11} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    formatter={(v: any) => formatPrice(Number(v))}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Xhiro" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Fitim" stroke="var(--color-success)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold">Burimi i të ardhurave</h2>
          {data.split.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Ende pa të dhëna.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.split} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {data.split.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? "var(--color-primary)" : "var(--color-success)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPrice(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="min-w-0 truncate text-sm font-bold">Bilanci mujor</h2>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() =>
                exportOrdersToExcel(data.orders as any, {
                  gross: data.gross,
                  shippingCosts: data.shippingCosts,
                  net: data.net,
                  orders: data.count,
                })
              }
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() =>
                exportFinancialsToPDF(
                  {
                    gross: data.gross,
                    shippingCosts: data.shippingCosts,
                    net: data.net,
                    orders: data.count,
                    shippingPrice: 0,
                  },
                  data.orders as any,
                )
              }
            >
              <FileText className="mr-1.5 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>
        {data.series.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Ende pa të dhëna.</p>
        ) : (
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="muaji" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  formatter={(v: any) => formatPrice(Number(v))}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="Fitim" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
