import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Loader2,
  Upload,
  ScanText,
  Plus,
  Trash2,
  Pencil,
  Download,
  Wallet,
  TrendingUp,
  Package2,
  Truck,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { requireToken } from "@/lib/admin-auth";
import {
  KOSOVO_CITIES, ORDER_STATUSES, STATUS_QUICK_FILTERS, formatOrderNo, formatPrice,
  statusLabel, statusBadgeClass, matchKosovoCity,
} from "@/lib/cities";
import { CitySelect } from "@/components/ui/city-select";
import { ShippingLabelDialog, type ShippingLabelData } from "@/components/admin/shipping-label";
import {
  adminListPrivateOrders,
  adminInsertPrivateOrders,
  adminUpdatePrivateOrder,
  adminDeletePrivateOrder,
  type PrivateOrderInput,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/private")({
  component: PrivateOrdersPage,
});

type Row = PrivateOrderInput & {
  id: string;
  order_no: number | null;
  profit: number;
  created_at: string;
};

const EMPTY: PrivateOrderInput = {
  customer_name: "",
  phone: "",
  country: "Kosovë",
  city: "",
  address: "",
  description: "",
  cost_price: 0,
  selling_price: 0,
  shipping_cost: 0,
  status: "processing",
  notes: "",
};

// ---------- Excel helpers ----------
const norm = (s: string) =>
  s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const FIELD_ALIASES: Record<keyof PrivateOrderInput, string[]> = {
  customer_name: ["emri", "emriimbiemri", "klienti", "customer", "name", "emriklientit"],
  phone: ["telefoni", "numri", "tel", "phone", "numriitelefonit"],
  country: ["shteti", "country", "shtetit"],
  city: ["qyteti", "city", "vendi"],
  address: ["adresa", "address", "rruga"],
  description: ["pershkrimi", "produkti", "description", "artikulli"],
  cost_price: ["kostoja", "cmimiikostos", "costprice", "kosto", "blerja"],
  selling_price: ["cmimiishitjes", "shitja", "sellingprice", "cmimi", "price"],
  shipping_cost: ["kostoetransportit", "transporti", "posta", "shipping", "shippingcost"],
  status: ["statusi", "status"],
  notes: ["shenime", "notes", "koment"],
};

function pickField(row: Record<string, unknown>, field: keyof PrivateOrderInput) {
  const aliases = FIELD_ALIASES[field];
  for (const key of Object.keys(row)) {
    if (aliases.includes(norm(key))) return row[key];
  }
  return undefined;
}

function toNum(v: unknown) {
  const n = Number(String(v ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ---------- OCR parsing ----------
function parseOcrText(text: string): Partial<PrivateOrderInput> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const joined = lines.join(" ");

  const phone = joined.match(/(\+?\d[\d\s\-()]{6,17}\d)/)?.[1]?.trim() ?? "";
  const city =
    KOSOVO_CITIES.find((c) => norm(joined).includes(norm(c))) ??
    matchKosovoCity(joined) ??
    "";

  let customer_name = "";
  for (const l of lines) {
    const words = l.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && words.every((w) => w.length > 1)) {
      customer_name = words.join(" ");
      break;
    }
  }

  const addressLine =
    lines.find((l) => /rr|rruga|street|nr\.?\s*\d|lagjja|lagje/i.test(l)) ??
    lines.find((l) => /\d/.test(l) && l.length > 8) ??
    "";

  return {
    customer_name,
    phone,
    city,
    address: addressLine,
    country: "Kosovë",
  };
}

function PrivateOrdersPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PrivateOrderInput>(EMPTY);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [slip, setSlip] = useState<ShippingLabelData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["private-orders"],
    queryFn: async () => (await adminListPrivateOrders({ data: { token: requireToken() } })) as unknown as Row[],
  });

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const group = STATUS_QUICK_FILTERS.find((f) => f.key === statusFilter);
        if (group && group.key !== "all" && !group.statuses.includes(r.status)) return false;
        if (q) {
          const hay = `${r.customer_name} ${r.phone} ${r.city} ${r.description}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [rows, statusFilter, q],
  );

  const metrics = useMemo(() => {
    const gross = filtered.reduce((s, r) => s + Number(r.selling_price ?? 0), 0);
    const cost = filtered.reduce((s, r) => s + Number(r.cost_price ?? 0), 0);
    const shipping = filtered.reduce((s, r) => s + Number(r.shipping_cost ?? 0), 0);
    return { gross, cost, shipping, net: gross - cost - shipping, count: filtered.length };
  }, [filtered]);

  const save = useMutation({
    mutationFn: async () => {
      const token = requireToken();
      if (editId) return adminUpdatePrivateOrder({ data: { token, id: editId, order: form } });
      return adminInsertPrivateOrders({ data: { token, orders: [form] } });
    },
    onSuccess: () => {
      toast.success(editId ? "Porosia u përditësua" : "Porosia u shtua");
      setDialogOpen(false);
      setEditId(null);
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["private-orders"] });
    },
    onError: (e: any) => toast.error("Gabim", { description: e?.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) =>
      adminDeletePrivateOrder({ data: { token: requireToken(), id } }),
    onSuccess: () => {
      toast.success("Porosia u fshi");
      qc.invalidateQueries({ queryKey: ["private-orders"] });
    },
    onError: (e: any) => toast.error("Gabim", { description: e?.message }),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ row, status }: { row: any; status: string }) =>
      adminUpdatePrivateOrder({
        data: {
          token: requireToken(),
          id: row.id,
          order: {
            customer_name: row.customer_name,
            phone: row.phone ?? "",
            country: row.country ?? "Kosovë",
            city: row.city ?? "",
            address: row.address ?? "",
            description: row.description ?? "",
            cost_price: Number(row.cost_price ?? 0),
            selling_price: Number(row.selling_price ?? 0),
            shipping_cost: Number(row.shipping_cost ?? 0),
            status,
            notes: row.notes ?? "",
          },
        },
      }),
    onSuccess: () => {
      toast.success("Statusi u përditësua");
      qc.invalidateQueries({ queryKey: ["private-orders"] });
    },
    onError: (e: any) => toast.error("Gabim", { description: e?.message }),
  });


  async function handleExcel(file: File) {
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!]!;
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const orders: PrivateOrderInput[] = json
        .map((r) => ({
          customer_name: String(pickField(r, "customer_name") ?? "").trim(),
          phone: String(pickField(r, "phone") ?? "").trim(),
          country: String(pickField(r, "country") ?? "Kosovë").trim() || "Kosovë",
          city:
            matchKosovoCity(String(pickField(r, "city") ?? "")) ??
            String(pickField(r, "city") ?? "").trim(),
          address: String(pickField(r, "address") ?? "").trim(),
          description: String(pickField(r, "description") ?? "").trim(),
          cost_price: toNum(pickField(r, "cost_price")),
          selling_price: toNum(pickField(r, "selling_price")),
          shipping_cost: toNum(pickField(r, "shipping_cost")),
          status: String(pickField(r, "status") ?? "processing").trim() || "processing",
          notes: String(pickField(r, "notes") ?? "").trim(),
        }))
        .filter((o) => o.customer_name);
      if (!orders.length) {
        toast.error("Asnjë rresht i vlefshëm nuk u gjet në skedar");
        return;
      }
      await adminInsertPrivateOrders({ data: { token: requireToken(), orders } });
      toast.success(`U importuan ${orders.length} porosi private`);
      qc.invalidateQueries({ queryKey: ["private-orders"] });
    } catch (e: any) {
      toast.error("Importimi dështoi", { description: e?.message });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      {
        Emri: "Filan Fisteku",
        Telefoni: "044 123 456",
        Shteti: "Kosovë",
        Qyteti: "Prishtinë",
        Adresa: "Rr. Dëshmorët e Kombit, nr. 12",
        Përshkrimi: "Bluzë sportive",
        Kostoja: 8,
        "Çmimi i shitjes": 20,
        "Kosto e transportit": 2,
        Statusi: "processing",
        Shënime: "",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PorosiPrivate");
    XLSX.writeFile(wb, "template_porosi_private.xlsx");
  }

  async function handlePhoto(file: File) {
    setOcrBusy(true);
    setOcrProgress(0);
    try {
      const { default: Tesseract } = await import("tesseract.js");
      const res = await Tesseract.recognize(file, "eng", {
        logger: (m: any) => {
          if (m.status === "recognizing text") setOcrProgress(Math.round((m.progress ?? 0) * 100));
        },
      });
      const parsed = parseOcrText(res.data.text ?? "");
      setForm((p) => ({ ...p, ...parsed, notes: (res.data.text ?? "").slice(0, 900) }));
      setEditId(null);
      setDialogOpen(true);
      toast.success("Të dhënat u lexuan nga fotoja", {
        description: "Kontrollo dhe korrigjo para se t'i ruash.",
      });
    } catch (e: any) {
      toast.error("Leximi i fotos dështoi", { description: e?.message });
    } finally {
      setOcrBusy(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  const set = <K extends keyof PrivateOrderInput>(k: K, v: PrivateOrderInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Porosi Private</h1>
          <p className="text-sm text-muted-foreground">
            Menaxho porositë private, importo nga Excel ose lexo adresën nga një foto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" /> Shkarko Template
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Importo Excel
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            disabled={ocrBusy}
            onClick={() => photoRef.current?.click()}
          >
            {ocrBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ScanText className="mr-2 h-4 w-4" />
            )}
            {ocrBusy ? `Duke lexuar ${ocrProgress}%` : "Lexo nga Foto (OCR)"}
          </Button>
          <Button
            className="rounded-full"
            onClick={() => {
              setEditId(null);
              setForm(EMPTY);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Porosi e re
          </Button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleExcel(e.target.files[0]!)}
      />
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0]!)}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Porosi Private", value: String(metrics.count), icon: Package2, tone: "text-primary" },
          { label: "Total Bruto", value: formatPrice(metrics.gross), icon: Wallet, tone: "text-primary" },
          { label: "Kostot (mall + postë)", value: formatPrice(metrics.cost + metrics.shipping), icon: Truck, tone: "text-warning" },
          { label: "Fitimi Neto", value: formatPrice(metrics.net), icon: TrendingUp, tone: "text-success" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase text-muted-foreground">{m.label}</p>
                <Icon className={`h-4 w-4 ${m.tone}`} />
              </div>
              <p className={`mt-2 text-2xl font-bold ${m.tone}`}>{m.value}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Kërko klient, telefon, qytet..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_QUICK_FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? rows.length
                : rows.filter((r) => f.statuses.includes(r.status)).length;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === f.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card hover:bg-secondary"
                }`}
              >
                {f.label}
                <span
                  className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] ${
                    statusFilter === f.key ? "bg-primary-foreground/20" : "bg-secondary"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Klienti</th>
              <th className="px-4 py-3">Kontakti</th>
              <th className="px-4 py-3">Destinacioni</th>
              <th className="px-4 py-3">Përshkrimi</th>
              <th className="px-4 py-3 text-right">Kosto</th>
              <th className="px-4 py-3 text-right">Shitje</th>
              <th className="px-4 py-3 text-right">Postë</th>
              <th className="px-4 py-3 text-right">Fitimi</th>
              <th className="px-4 py-3">Statusi</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                  Nuk ka porosi private.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs font-bold text-muted-foreground">
                  {formatOrderNo(r.order_no, r.id)}
                </td>
                <td className="px-4 py-3 font-medium">{r.customer_name}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.phone || "—"}</td>
                <td className="px-4 py-3">
                  <span className="block">{[r.city, r.country].filter(Boolean).join(", ")}</span>
                  <span className="block text-xs text-muted-foreground">{r.address}</span>
                </td>
                <td className="px-4 py-3 max-w-[220px] truncate">{r.description || "—"}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(r.cost_price)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(r.selling_price)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(r.shipping_cost)}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                    Number(r.profit) >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatPrice(r.profit)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(r.status)}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <OrderQuickActions
                      phone={r.phone}
                      status={r.status}
                      onStatusChange={(status: string) => changeStatus.mutate({ row: r, status })}
                      onPrint={() =>
                        setSlip({
                          id: r.id,
                          order_no: r.order_no,
                          customer_name: r.customer_name,
                          phone: r.phone ?? "",
                          city: r.city ?? "",
                          country: r.country ?? "Kosovë",
                          address: r.address ?? "",
                          items: [
                            {
                              title: r.description || "Porosi private",
                              quantity: 1,
                              price: Number(r.selling_price ?? 0),
                            },
                          ],
                          total: Number(r.selling_price ?? 0),
                        })
                      }
                    />

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditId(r.id);
                        setForm({
                          customer_name: r.customer_name,
                          phone: r.phone ?? "",
                          country: r.country ?? "Kosovë",
                          city: r.city ?? "",
                          address: r.address ?? "",
                          description: r.description ?? "",
                          cost_price: Number(r.cost_price ?? 0),
                          selling_price: Number(r.selling_price ?? 0),
                          shipping_cost: Number(r.shipping_cost ?? 0),
                          status: r.status ?? "processing",
                          notes: r.notes ?? "",
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm("Fshij këtë porosi private?")) del.mutate(r.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ShippingLabelDialog order={slip} open={!!slip} onOpenChange={(v) => !v && setSlip(null)} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edito porosinë private" : "Porosi private e re"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Emri i klientit *</Label>
              <Input
                value={form.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Telefoni</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <Label>Shteti</Label>
                <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Qyteti</Label>
                <CitySelect value={form.city} onChange={(v) => set("city", v)} />
              </div>
              <div>
                <Label>Statusi</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
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
              </div>
            </div>
            <div>
              <Label>Adresa</Label>
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div>
              <Label>Përshkrimi i produktit</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Kostoja (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.cost_price}
                  onChange={(e) => set("cost_price", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Shitja (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.selling_price}
                  onChange={(e) => set("selling_price", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Posta (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.shipping_cost}
                  onChange={(e) => set("shipping_cost", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3 text-sm">
              Fitimi:{" "}
              <strong className="text-success">
                {formatPrice(
                  Number(form.selling_price) - Number(form.cost_price) - Number(form.shipping_cost),
                )}
              </strong>
            </div>
            <div>
              <Label>Shënime</Label>
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anulo
            </Button>
            <Button
              disabled={save.isPending || !form.customer_name.trim()}
              onClick={() => save.mutate()}
            >
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ruaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
