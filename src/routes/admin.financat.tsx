import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Coins,
  TrendingUp,
  Truck,
  Wallet,
  Loader2,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Receipt,
} from "lucide-react";
import { requireToken } from "@/lib/admin-auth";
import {
  adminAddExpense,
  adminDeleteExpense,
  adminListExpenses,
  adminListOrders,
  adminListPrivateOrders,
  adminUploadExpenseReceipt,

} from "@/lib/admin.functions";
import { formatPrice } from "@/lib/cities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { exportFinancialsToPDF, exportOrdersToExcel } from "@/lib/exports";

export const Route = createFileRoute("/admin/financat")({
  component: FinancePage,
  head: () => ({
    meta: [
      { title: "Financat — Paneli FlladituKS" },
      {
        name: "description",
        content: "Pasqyra financiare e FlladituKS: xhiroja, shpenzimet operative dhe fitimi neto real.",
      },
      { property: "og:title", content: "Financat — Paneli FlladituKS" },
      {
        property: "og:description",
        content: "Pasqyra financiare e FlladituKS: xhiroja, shpenzimet operative dhe fitimi neto real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CONFIRMED = ["processing", "shipped", "completed"];
const MONTHS = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gsh", "Sht", "Tet", "Nën", "Dhj"];

const EXPENSE_CATEGORIES = [
  "Reklama & Marketing",
  "Paketim & Kuti",
  "Transport & Logjistikë",
  "Inventar & Furnizim",
  "Software & Licenca",
  "Të tjera",
];

const EXPENSE_COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-destructive)",
  "oklch(0.65 0.15 300)",
  "var(--color-muted-foreground)",
];


type Preset = "today" | "week" | "month" | "lastMonth" | "all" | "custom";

const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: "today", label: "Sot" },
  { value: "week", label: "Këtë Javë" },
  { value: "month", label: "Këtë Muaj" },
  { value: "lastMonth", label: "Muajin e Kaluar" },
  { value: "all", label: "Të gjitha" },
];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Resolve a preset into an inclusive [from, to] range of yyyy-mm-dd strings. */
function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === "today") return { from: toKey(today), to: toKey(today) };
  if (p === "week") {
    const dow = (today.getDay() + 6) % 7; // Monday-first
    const start = new Date(today);
    start.setDate(today.getDate() - dow);
    return { from: toKey(start), to: toKey(today) };
  }
  if (p === "month") {
    return { from: toKey(new Date(now.getFullYear(), now.getMonth(), 1)), to: toKey(today) };
  }
  if (p === "lastMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toKey(start), to: toKey(end) };
  }
  return { from: "", to: "" };
}

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

function AddExpenseDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(toKey(new Date()));
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [receiptName, setReceiptName] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Leximi i skedarit dështoi"));
        reader.readAsDataURL(file);
      });
      const res = await adminUploadExpenseReceipt({
        data: {
          token: requireToken(),
          filename: file.name,
          contentType: file.type,
          dataBase64,
        },
      });
      setReceiptUrl(res.url);
      setReceiptName(file.name);
      toast.success("Fatura u ngarkua");
    } catch (e: any) {
      toast.error("Ngarkimi dështoi", { description: e.message });
    } finally {
      setUploading(false);
    }
  }

  const m = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Shuma është e pavlefshme");
      await adminAddExpense({
        data: {
          token: requireToken(),
          category,
          description: description.trim(),
          amount: value,
          spent_at: spentAt,
          ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("Shpenzimi u regjistrua");
      setDescription("");
      setAmount("");
      setReceiptUrl("");
      setReceiptName("");
      setOpen(false);
      onSaved();
    },
    onError: (e: Error) => toast.error("Gabim", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full">
          <Plus className="mr-1.5 h-4 w-4" /> Shto Shpenzim
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Shto Shpenzim Operativ</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Kategoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="exp-desc">Përshkrimi</Label>
            <Input
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="P.sh. Reklamë Instagram — javë"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="exp-amount">Shuma (€) *</Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="exp-date">Data</Label>
              <Input
                id="exp-date"
                type="date"
                value={spentAt}
                onChange={(e) => setSpentAt(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="exp-receipt">📄 Ngarko Faturë (PDF/Imazh)</Label>
            <Input
              id="exp-receipt"
              type="file"
              accept="image/*,application/pdf"
              disabled={uploading}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {uploading && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Duke ngarkuar...
              </p>
            )}
            {receiptUrl && (
              <p className="mt-1 truncate text-xs text-success">
                ✓ {receiptName || "Fatura e bashkangjitur"}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => m.mutate()}
            disabled={m.isPending || uploading}
            className="w-full rounded-full"
          >
            {m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Ruaj Shpenzimin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function FinancePage() {
  const qc = useQueryClient();
  const [preset, setPreset] = useState<Preset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const ordersQ = useQuery({
    queryKey: ["admin", "orders", "fin"],
    queryFn: () => adminListOrders({ data: { token: requireToken(), limit: 500 } }),
  });
  const privQ = useQuery({
    queryKey: ["admin", "private", "fin"],
    queryFn: () => adminListPrivateOrders({ data: { token: requireToken() } }),
  });
  const expQ = useQuery({
    queryKey: ["admin", "expenses"],
    queryFn: () => adminListExpenses({ data: { token: requireToken() } }),
  });

  const delExpense = useMutation({
    mutationFn: (id: string) => adminDeleteExpense({ data: { token: requireToken(), id } }),
    onSuccess: () => {
      toast.success("Shpenzimi u fshi");
      qc.invalidateQueries({ queryKey: ["admin", "expenses"] });
    },
    onError: (e: Error) => toast.error("Gabim", { description: e.message }),
  });

  const loading = ordersQ.isLoading || privQ.isLoading || expQ.isLoading;

  const data = useMemo(() => {
    const fromTs = range.from ? new Date(`${range.from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const toTs = range.to ? new Date(`${range.to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
    const inRange = (d: string) => {
      const t = new Date(d).getTime();
      return t >= fromTs && t <= toTs;
    };

    const orders = (ordersQ.data ?? []).filter((o: any) => inRange(o.created_at));
    const privates = (privQ.data ?? []).filter((p: any) => inRange(p.created_at));
    const expenses = (expQ.data ?? []).filter((e: any) => inRange(`${e.spent_at}T12:00:00`));

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
    const operating = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
    const net = gross - shippingCosts - privCost;
    const realNet = net - operating;

    const storeProfit = storeGross - storeShipping;
    const privProfit = privGross - privCost - privShipping;

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
    for (const e of expenses) add(`${e.spent_at}T12:00:00`, 0, -Number(e.amount ?? 0));
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

    const byCatMap: Record<string, number> = {};
    for (const e of expenses as any[]) {
      const key = String(e.category || "Të tjera");
      byCatMap[key] = (byCatMap[key] ?? 0) + Number(e.amount ?? 0);
    }
    const byCategory = Object.entries(byCatMap)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);

    return {
      byCategory,

      gross,
      shippingCosts,
      productCosts: privCost,
      operating,
      net,
      realNet,
      pendingCod,
      collected,
      rejectRate,
      aov,
      count,
      series,
      split,
      orders,
      expenses,
      storeGross,
      privGross,
      storeProfit,
      privProfit,
      storeCount: confirmedOrders.length,
      privCount: confirmedPrivate.length,
    };
  }, [ordersQ.data, privQ.data, expQ.data, range]);

  if (loading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const sharePct = data.gross > 0 ? (data.storeGross / data.gross) * 100 : 0;

  return (
    <div className="space-y-5">
      <header className="min-w-0">
        <h1 className="truncate text-xl font-black sm:text-2xl">Financat</h1>
        <p className="text-sm text-muted-foreground">
          Pasqyra e plotë e të ardhurave, shpenzimeve dhe fitimit real.
        </p>
      </header>

      {/* Date range toolbar */}
      <div className="rounded-2xl border bg-card p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Filtro sipas Datës
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1 rounded-full bg-secondary p-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPreset(p.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  preset === p.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="fin-from" className="text-xs">
                Nga
              </Label>
              <Input
                id="fin-from"
                type="date"
                className="h-9 w-[9.5rem]"
                value={preset === "custom" ? customFrom : range.from}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setCustomTo((t) => t || toKey(new Date()));
                  setPreset("custom");
                }}
              />
            </div>
            <div>
              <Label htmlFor="fin-to" className="text-xs">
                Deri
              </Label>
              <Input
                id="fin-to"
                type="date"
                className="h-9 w-[9.5rem]"
                value={preset === "custom" ? customTo : range.to}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setPreset("custom");
                }}
              />
            </div>
          </div>
        </div>
      </div>

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
        <Kpi
          label="Shpenzime Operative"
          value={formatPrice(data.operating)}
          icon={Receipt}
          tone="destructive"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Fitimi Neto Real"
          value={formatPrice(data.realNet)}
          icon={TrendingUp}
          tone={data.realNet >= 0 ? "success" : "destructive"}
          hint="Xhiro − kosto − postë − shpenzime"
        />
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
        <Kpi
          label="Norma e kthimeve"
          value={`${data.rejectRate.toFixed(1)}%`}
          icon={TrendingUp}
          tone={data.rejectRate > 15 ? "destructive" : "default"}
          hint={`${data.count} porosi të konfirmuara · VMP ${formatPrice(data.aov)}`}
        />
      </div>

      {/* Revenue source breakdown */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">Burimi i shitjeve: Dyqani vs Porosi Private</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              name: "Dyqani Online",
              gross: data.storeGross,
              profit: data.storeProfit,
              count: data.storeCount,
              cls: "bg-primary",
            },
            {
              name: "Porosi Private",
              gross: data.privGross,
              profit: data.privProfit,
              count: data.privCount,
              cls: "bg-success",
            },
          ].map((s) => (
            <div key={s.name} className="rounded-xl border p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <p className="min-w-0 truncate text-sm font-semibold">{s.name}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{s.count} porosi</span>
              </div>
              <p className="mt-1 text-xl font-black">{formatPrice(s.gross)}</p>
              <p className="text-xs text-muted-foreground">
                Fitim: <span className="font-semibold text-success">{formatPrice(s.profit)}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${sharePct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {sharePct.toFixed(0)}% dyqani online · {(100 - sharePct).toFixed(0)}% porosi private
        </p>
      </div>

      {/* Expenses list */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="min-w-0 truncate text-sm font-bold">Shpenzimet Operative</h2>
          <AddExpenseDialog
            onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "expenses"] })}
          />
        </div>
        {data.expenses.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nuk ka shpenzime për këtë periudhë.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {data.expenses.map((e: any) => (
              <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {e.category}
                    {e.description ? ` — ${e.description}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.spent_at}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-bold text-destructive">{formatPrice(e.amount)}</span>
                  {e.receipt_url && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full"
                      asChild
                      title="Shiko faturën"
                      aria-label="Shiko faturën"
                    >
                      <a href={e.receipt_url} target="_blank" rel="noreferrer">
                        <FileText className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => delExpense.mutate(e.id)}
                    aria-label="Fshij shpenzimin"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {data.byCategory.length > 0 && (
          <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={78}
                  >
                    {data.byCategory.map((_, i) => (
                      <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPrice(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 self-center">
              {data.byCategory.map((c, i) => {
                const pct = data.operating > 0 ? (c.value / data.operating) * 100 : 0;
                return (
                  <li key={c.name}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatPrice(c.value)} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          background: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
                  net: data.realNet,
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
                    net: data.realNet,
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
