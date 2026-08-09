import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy, Trash2, Phone, MapPin, Package2, TrendingUp, Truck, Wallet, Settings,
  FileSpreadsheet, FileText, MessageCircle, AlertTriangle, Send, Download, FileDown, Printer,
  Layers, X,
} from "lucide-react";
import { OrderQuickActions } from "@/components/admin/order-quick-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  adminListOrders, adminUpdateOrderStatus, adminDeleteOrder, adminFinancials,
  adminSetShippingPrice, adminRiskyPhones, adminSetTrackingNumber,
  adminBulkUpdateOrderStatus,
  getNotificationEmail, adminSetNotificationEmail,
  getEmailJsConfig, adminSetEmailJsConfig,
} from "@/lib/admin.functions";
import { requireToken } from "@/lib/admin-auth";
import {
  ORDER_STATUSES, STATUS_QUICK_FILTERS, formatOrderNo, formatPrice, statusLabel,
  statusBadgeClass, type OrderStatus,
} from "@/lib/cities";
import {
  ShippingLabelDialog, BulkShippingLabelsDialog, type ShippingLabelData,
} from "@/components/admin/shipping-label";
import {
  exportOrdersToExcel, exportFinancialsToPDF, exportInvoiceToPDF, buildWhatsAppLink,
  exportOrdersForCourier, buildShippedWhatsAppLink,
} from "@/lib/exports";
import { toast } from "sonner";


export const Route = createFileRoute("/admin/porosite")({
  component: OrdersPage,
});

type Order = {
  id: string;
  order_no: number | null;
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  items: Array<{ id: string; title: string; price: number; quantity: number }>;
  total: number;
  shipping_cost: number;
  status: OrderStatus | string;
  notes: string | null;
  tracking_number: string | null;
  created_at: string;
};

function OrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const data = await adminListOrders({ data: { token: requireToken() } });
      return (data ?? []) as unknown as Order[];
    },
  });

  const filtered = useMemo(() => {
    const group = STATUS_QUICK_FILTERS.find((f) => f.key === filter);
    if (!group || group.key === "all") return orders;
    return orders.filter((o) => group.statuses.includes(o.status as string));
  }, [orders, filter]);

  const [slipOrder, setSlipOrder] = useState<ShippingLabelData | null>(null);

  // State for the rejection reason modal
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function updateStatus(id: string, status: string, reason?: string) {
    try {
      await adminUpdateOrderStatus({ data: { token: requireToken(), id, status, reason } });
      toast.success(status === "rejected" ? "Porosia u shënua si Refuzuar" : "Statusi u përditësua");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-financials"] });
      qc.invalidateQueries({ queryKey: ["rejected-phones"] });
      qc.invalidateQueries({ queryKey: ["admin-top-selling"] });
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
    }
  }

  function handleStatusChange(o: Order, status: string) {
    if (status === "rejected" && o.status !== "rejected") {
      setRejectTarget(o);
      setRejectReason("");
      return;
    }
    updateStatus(o.id, status);
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    await updateStatus(rejectTarget.id, "rejected", rejectReason);
    setRejectTarget(null);
    setRejectReason("");
  }

  async function deleteOrder(id: string) {
    if (!confirm("Të fshihet kjo porosi?")) return;
    try {
      await adminDeleteOrder({ data: { token: requireToken(), id } });
      toast.success("Porosia u fshi");
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
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
    const c: Record<string, number> = {};
    for (const f of STATUS_QUICK_FILTERS)
      c[f.key] = f.key === "all"
        ? orders.length
        : orders.filter((o) => f.statuses.includes(o.status as string)).length;
    return c;
  }, [orders]);

  const { data: fin } = useQuery({
    queryKey: ["admin-financials"],
    queryFn: () => adminFinancials({ data: { token: requireToken() } }),
  });

  const { data: riskyPhones = {} } = useQuery({
    queryKey: ["rejected-phones"],
    queryFn: () => adminRiskyPhones({ data: { token: requireToken() } }),
  });
  const riskCount = (phone: string) =>
    (riskyPhones as Record<string, number>)[String(phone ?? "").replace(/\D/g, "")] ?? 0;

  // ---- Bulk selection ----
  const [selected, setSelected] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visibleIds = useMemo(() => filtered.map((o) => o.id), [filtered]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedSet.has(o.id)),
    [orders, selectedSet],
  );
  const [bulkPrint, setBulkPrint] = useState(false);

  function toggleOne(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleAll() {
    setSelected(allSelected ? [] : visibleIds);
  }

  async function bulkStatus(status: string) {
    try {
      await adminBulkUpdateOrderStatus({
        data: { token: requireToken(), ids: selected, status },
      });
      toast.success(`${selected.length} porosi u përditësuan në "${statusLabel(status)}"`);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["admin-financials"] });
      qc.invalidateQueries({ queryKey: ["rejected-phones"] });
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
    }
  }

  const toLabel = (o: Order): ShippingLabelData => ({
    id: o.id,
    order_no: o.order_no,
    customer_name: o.customer_name,
    phone: o.phone,
    city: o.city,
    country: "Kosovë",
    address: o.address,
    items: o.items ?? [],
    total: o.total,
  });


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Porositë</h1>
          <p className="text-sm text-muted-foreground">Të gjitha porositë live nga databaza.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NotificationEmailEditor />
          <EmailJsConfigEditor />
          <ShippingPriceEditor current={fin?.shippingPrice ?? 2} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-full">
                <Download className="mr-1 h-4 w-4" /> Eksporto Raportin
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportOrdersToExcel(orders, fin)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Shkarko në Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  fin && exportFinancialsToPDF({ ...fin }, orders)
                }
              >
                <FileText className="mr-2 h-4 w-4" /> Shkarko në PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FinanceCard
          label="Total Bruto (Xhiroja)"
          value={formatPrice(fin?.gross ?? 0)}
          sub={`${fin?.orders ?? 0} porosi të konfirmuara`}
          icon={TrendingUp}
          color="bg-primary/10 text-primary"
        />
        <FinanceCard
          label="Kostot e Postës"
          value={formatPrice(fin?.shippingCosts ?? 0)}
          sub={`${fin?.orders ?? 0} × ${formatPrice(fin?.shippingPrice ?? 0)}`}
          icon={Truck}
          color="bg-warning/15 text-warning-foreground"
        />
        <FinanceCard
          label="Fitimi Neto (Para të Pastra)"
          value={formatPrice(fin?.net ?? 0)}
          sub="Pa porositë e refuzuara"
          icon={Wallet}
          color="bg-success/15 text-success"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_QUICK_FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
            count={counts[f.key] ?? 0}
          >
            {f.label}
          </FilterChip>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto rounded-full"
          onClick={() =>
            exportOrdersForCourier(
              filtered as any,
              STATUS_QUICK_FILTERS.find((f) => f.key === filter)?.label ?? "Te-gjitha",
            )
          }
        >
          <FileSpreadsheet className="mr-1 h-4 w-4" /> Eksporto për Postën
        </Button>
      </div>

      {/* Select all + bulk actions toolbar */}
      {filtered.length > 0 && (
        <div className="sticky top-2 z-30 flex flex-wrap items-center gap-3 rounded-2xl border bg-card/95 p-3 shadow-sm backdrop-blur">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Zgjidh të gjitha porositë"
            />
            Zgjidh të gjitha ({filtered.length})
          </label>

          {selected.length > 0 && (
            <>
              <Badge className="rounded-full">{selected.length} të zgjedhura</Badge>
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => setBulkPrint(true)}
              >
                <Printer className="mr-1 h-4 w-4" /> Printo Etiketat ({selected.length})
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-full">
                    <Layers className="mr-1 h-4 w-4" /> Ndrysho Statusin Masiv
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Vendos statusin për të gjitha</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ORDER_STATUSES.map((s) => (
                    <DropdownMenuItem key={s.value} onClick={() => bulkStatus(s.value)}>
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => setSelected([])}
              >
                <X className="mr-1 h-4 w-4" /> Hiq zgjedhjen
              </Button>
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          Ende pa porosi në këtë status.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => {
            const risk = riskCount(o.phone);
            const isRisky = risk > 0 && !["rejected", "cancelled"].includes(o.status as string);
            return (
              <li
                key={o.id}
                className={`rounded-2xl border bg-card p-4 shadow-sm ${selectedSet.has(o.id) ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <Checkbox
                      className="mt-1"
                      checked={selectedSet.has(o.id)}
                      onCheckedChange={() => toggleOne(o.id)}
                      aria-label={`Zgjidh porosinë ${formatOrderNo(o.order_no, o.id)}`}
                    />
                    <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-muted-foreground">
                        {formatOrderNo(o.order_no, o.id)}
                      </span>
                      <h3 className="font-semibold">{o.customer_name}</h3>
                      <Badge
                        variant="outline"
                        className={`rounded-full text-xs font-semibold ${statusBadgeClass(o.status)}`}
                      >
                        {statusLabel(o.status)}
                      </Badge>
                      {isRisky && (
                        <Badge className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Rrezik Kthimi ({risk} porosi të kthyera)
                        </Badge>
                      )}
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
                  </div>
                  <div className="shrink-0 text-right">

                    <p className="text-lg font-bold text-primary">{formatPrice(o.total)}</p>
                    <p className="text-xs text-muted-foreground">Pagesa në dorë</p>
                    <OrderQuickActions
                      className="mt-2 justify-end"
                      phone={o.phone}
                      status={o.status}
                      whatsappHref={buildShippedWhatsAppLink(o)}
                      onStatusChange={(v: string) => handleStatusChange(o, v)}
                      onPrint={() => setSlipOrder(toLabel(o))}
                    />

                  </div>

                </div>

                <div className="mt-3 rounded-xl bg-secondary/40 p-3">
                  <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Package2 className="h-3.5 w-3.5" /> Artikujt
                  </p>
                  <ul className="space-y-1 text-sm">
                    {o.items?.map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{it.quantity}× {it.title}</span>
                        <span className="text-muted-foreground">{formatPrice(it.price * it.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  {o.notes && (
                    <p className="mt-2 whitespace-pre-wrap border-t pt-2 text-xs text-muted-foreground">
                      Shënim: {o.notes}
                    </p>
                  )}
                </div>

                <TrackingEditor order={o} />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Select value={o.status} onValueChange={(v) => handleStatusChange(o, v)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => copyForPost(o)} className="rounded-full">
                    <Copy className="mr-1 h-4 w-4" /> Kopjo për Postën
                  </Button>
                  <Button
                    variant="outline" size="sm" asChild
                    className="rounded-full border-green-600 text-green-700 hover:bg-green-50"
                  >
                    <a href={buildWhatsAppLink(o)} target="_blank" rel="noreferrer">
                      <MessageCircle className="mr-1 h-4 w-4" /> Njofto në WhatsApp
                    </a>
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() =>
                      setSlipOrder({
                        id: o.id,
                        order_no: o.order_no,
                        customer_name: o.customer_name,
                        phone: o.phone,
                        city: o.city,
                        country: "Kosovë",
                        address: o.address,
                        items: o.items ?? [],
                        total: o.total,
                      })
                    }
                    className="rounded-full"
                  >
                    <Printer className="mr-1 h-4 w-4" /> Printo Etiketën
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => exportInvoiceToPDF(o)}
                    className="rounded-full"
                  >
                    <FileDown className="mr-1 h-4 w-4" /> Faturë PDF
                  </Button>
                  <Button
                    variant="ghost" size="sm" onClick={() => deleteOrder(o.id)}
                    className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Fshij
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ShippingLabelDialog
        order={slipOrder}
        open={!!slipOrder}
        onOpenChange={(v) => !v && setSlipOrder(null)}
      />

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuzo porosinë</DialogTitle>
            <DialogDescription>
              Shëno një arsye të shkurtër. Stoku i produkteve do të kthehet automatikisht në dispozicion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Arsyeja</Label>
            <Textarea
              id="reject-reason"
              placeholder="p.sh. Nuk u lajmërua në telefon"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Anulo</Button>
            <Button variant="destructive" onClick={confirmReject}>
              <Send className="mr-1 h-4 w-4" /> Konfirmo Refuzimin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TrackingEditor({ order }: { order: Order }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(order.tracking_number ?? "");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await adminSetTrackingNumber({ data: { token: requireToken(), id: order.id, tracking: value } });
      toast.success("Numri i fletëgarkesës u ruajt");
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Label className="text-xs text-muted-foreground">Numri i Fletëgarkesës (Tracking):</Label>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="p.sh. POSTA-123456"
        className="h-8 w-48"
      />
      <Button size="sm" variant="outline" onClick={save} disabled={saving || value === (order.tracking_number ?? "")}>
        {saving ? "Duke ruajtur..." : "Ruaj"}
      </Button>
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

function FinanceCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ShippingPriceEditor({ current }: { current: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(current.toFixed(2)));
  const [saving, setSaving] = useState(false);

  async function save() {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Çmim i pavlefshëm");
      return;
    }
    setSaving(true);
    try {
      await adminSetShippingPrice({ data: { token: requireToken(), price: num } });
      toast.success(`Çmimi i postës u përditësua në ${formatPrice(num)}`);
      qc.invalidateQueries({ queryKey: ["admin-financials"] });
      setOpen(false);
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(String(current.toFixed(2)));
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Settings className="mr-1 h-4 w-4" /> Edito Çmimin e Postës ({formatPrice(current)})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Çmimi i Postës</DialogTitle>
          <DialogDescription>
            Ky çmim aplikohet automatikisht në checkout. Falas për porosi mbi 20.00 €.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="ship">Çmimi i ri (€)</Label>
          <Input
            id="ship"
            type="number"
            step="0.01"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Anulo
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Duke ruajtur..." : "Ruaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotificationEmailEditor() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["notification-email"],
    queryFn: () => getNotificationEmail(),
  });
  const current = data?.email ?? null;

  async function save() {
    const value = email.trim();
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) {
      toast.error("Email i pavlefshëm");
      return;
    }
    setSaving(true);
    try {
      await adminSetNotificationEmail({ data: { token: requireToken(), email: value } });
      toast.success("Email-i për njoftime u ruajt me sukses!");
      qc.invalidateQueries({ queryKey: ["notification-email"] });
      setOpen(false);
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setEmail(current ?? "");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Send className="mr-1 h-4 w-4" />
          {current ? `Njoftime: ${current}` : "Shto Email për Njoftime"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email për njoftime të porosive</DialogTitle>
          <DialogDescription>
            Çdo porosi e re do të dërgohet automatikisht në këtë adresë (përmes EmailJS).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {current && (
            <p className="text-xs text-muted-foreground">
              Email-i aktual: <span className="font-medium text-foreground">{current}</span>
            </p>
          )}
          <Label htmlFor="notify-email">Email-i</Label>
          <Input
            id="notify-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="njoftimet@shembull.com"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Anulo</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Duke ruajtur..." : "Shto Email për Njoftime"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmailJsConfigEditor() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ serviceId: "", templateId: "", publicKey: "" });

  const { data } = useQuery({
    queryKey: ["emailjs-config"],
    queryFn: () => getEmailJsConfig(),
  });
  const configured =
    !!(data?.serviceId && data?.templateId && data?.publicKey);

  async function save() {
    if (!form.serviceId.trim() || !form.templateId.trim() || !form.publicKey.trim()) {
      toast.error("Plotëso të 3 fushat");
      return;
    }
    setSaving(true);
    try {
      await adminSetEmailJsConfig({
        data: {
          token: requireToken(),
          serviceId: form.serviceId.trim(),
          templateId: form.templateId.trim(),
          publicKey: form.publicKey.trim(),
        },
      });
      toast.success("Konfigurimi i EmailJS u ruajt!");
      qc.invalidateQueries({ queryKey: ["emailjs-config"] });
      setOpen(false);
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setForm({
            serviceId: data?.serviceId ?? "",
            templateId: data?.templateId ?? "",
            publicKey: data?.publicKey ?? "",
          });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Settings className="mr-1 h-4 w-4" />
          {configured ? "EmailJS: i konfiguruar" : "Konfiguro EmailJS"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cilësimet e EmailJS</DialogTitle>
          <DialogDescription>
            Vendos ID-të e EmailJS që përdoren për të dërguar njoftimet e porosive.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ejs-service">Service ID</Label>
            <Input
              id="ejs-service"
              value={form.serviceId}
              onChange={(e) => setForm((p) => ({ ...p, serviceId: e.target.value }))}
              placeholder="service_xxxxxxx"
            />
          </div>
          <div>
            <Label htmlFor="ejs-template">Template ID</Label>
            <Input
              id="ejs-template"
              value={form.templateId}
              onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value }))}
              placeholder="template_xxxxxxx"
            />
          </div>
          <div>
            <Label htmlFor="ejs-public">Public Key</Label>
            <Input
              id="ejs-public"
              value={form.publicKey}
              onChange={(e) => setForm((p) => ({ ...p, publicKey: e.target.value }))}
              placeholder="xxxxxxxxxxxxxxxx"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Template duhet të përdorë variablat: to_email, order_id, customer_name, phone,
            city, address, items, shipping_cost, total, notes, subject.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Anulo</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Duke ruajtur..." : "Ruaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
