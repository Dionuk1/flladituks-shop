import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2, Shuffle, Save, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminListDiscounts,
  adminSaveDiscount,
  adminToggleDiscount,
  adminDeleteDiscount,
  type DiscountRow,
} from "@/lib/admin.functions";
import { requireToken } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/cities";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/discounts")({
  component: DiscountsPage,
  head: () => ({
    meta: [
      { title: "Kodet e Zbritjes | FlladituKS Admin" },
      { name: "description", content: "Menaxho kodet promocionale të dyqanit FlladituKS." },
    ],
  }),
});

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convert a naive `datetime-local` value ("YYYY-MM-DDTHH:mm") into a full ISO
 * string that carries the browser's timezone offset, so the exact wall-clock
 * time the admin picked is what gets stored (no ±2/3h drift).
 */
function fromLocalInput(local: string | null | undefined): string | null {
  if (!local) return null;
  const d = new Date(local); // parsed as local time
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

type FormState = {
  id?: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  start_date: string;
  expires_at: string;
  max_uses: string;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  code: "",
  discount_type: "percentage",
  discount_value: "10",
  start_date: toLocalInput(new Date().toISOString()),
  expires_at: "",
  max_uses: "",
  is_active: true,
});

function statusOf(d: DiscountRow) {
  const now = Date.now();
  if (!d.is_active) return { label: "Çaktivizuar", cls: "bg-muted text-muted-foreground" };
  if (d.expires_at && now > new Date(d.expires_at).getTime())
    return { label: "Skaduar", cls: "bg-destructive/15 text-destructive" };
  if (d.start_date && now < new Date(d.start_date).getTime())
    return { label: "Në pritje", cls: "bg-amber-500/15 text-amber-600" };
  if (d.max_uses != null && d.used_count >= d.max_uses)
    return { label: "Limiti u mbush", cls: "bg-destructive/15 text-destructive" };
  return { label: "Aktiv", cls: "bg-success/15 text-success" };
}

function DiscountsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-discounts"],
    queryFn: () => adminListDiscounts({ data: { token: requireToken() } }),
  });

  const rows = useMemo(() => data ?? [], [data]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  function openNew() {
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(d: DiscountRow) {
    setForm({
      id: d.id,
      code: d.code,
      discount_type: d.discount_type === "fixed" ? "fixed" : "percentage",
      discount_value: String(d.discount_value),
      start_date: toLocalInput(d.start_date),
      expires_at: toLocalInput(d.expires_at),
      max_uses: d.max_uses != null ? String(d.max_uses) : "",
      is_active: d.is_active,
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      await adminSaveDiscount({
        data: {
          token: requireToken(),
          values: {
            ...(form.id ? { id: form.id } : {}),
            code: form.code.trim().toUpperCase(),
            discount_type: form.discount_type,
            discount_value: Number(form.discount_value),
            start_date: fromLocalInput(form.start_date) ?? new Date().toISOString(),
            expires_at: fromLocalInput(form.expires_at),
            max_uses: form.max_uses ? Number(form.max_uses) : null,
            is_active: form.is_active,
          },
        },
      });
      toast.success(form.id ? "Kodi u përditësua" : "Kodi u krijua");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-discounts"] });
    } catch (e: any) {
      toast.error("Gabim", { description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(d: DiscountRow) {
    try {
      await adminToggleDiscount({
        data: { token: requireToken(), id: d.id, is_active: !d.is_active },
      });
      qc.invalidateQueries({ queryKey: ["admin-discounts"] });
    } catch (e: any) {
      toast.error("Gabim", { description: e?.message });
    }
  }

  async function remove(d: DiscountRow) {
    if (!confirm(`Të fshihet kodi ${d.code}?`)) return;
    try {
      await adminDeleteDiscount({ data: { token: requireToken(), id: d.id } });
      toast.success("Kodi u fshi");
      qc.invalidateQueries({ queryKey: ["admin-discounts"] });
    } catch (e: any) {
      toast.error("Gabim", { description: e?.message });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Ticket className="h-6 w-6 text-primary" /> Kodet e Zbritjes
          </h1>
          <p className="text-sm text-muted-foreground">
            Krijo dhe menaxho kodet promocionale për checkout.
          </p>
        </div>
        <Button onClick={openNew} className="rounded-full">
          <Plus className="mr-1 h-4 w-4" /> Kod i Ri
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Kodi</th>
              <th className="p-3">Vlera</th>
              <th className="p-3">Periudha</th>
              <th className="p-3">Përdorime</th>
              <th className="p-3">Statusi</th>
              <th className="p-3 text-right">Veprime</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Nuk ka kode ende.
                </td>
              </tr>
            )}
            {rows.map((d) => {
              const st = statusOf(d);
              return (
                <tr key={d.id} className="border-t">
                  <td className="p-3 font-mono font-semibold">{d.code}</td>
                  <td className="p-3">
                    {d.discount_type === "percentage"
                      ? `${Number(d.discount_value)}%`
                      : formatPrice(Number(d.discount_value))}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(d.start_date).toLocaleDateString("sq-AL")} —{" "}
                    {d.expires_at
                      ? new Date(d.expires_at).toLocaleDateString("sq-AL")
                      : "pa afat"}
                  </td>
                  <td className="p-3">
                    {d.used_count} / {d.max_uses ?? "∞"}
                  </td>
                  <td className="p-3">
                    <Badge className={`rounded-full border-0 ${st.cls}`}>{st.label}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      <Switch checked={d.is_active} onCheckedChange={() => toggle(d)} />
                      <Button size="icon" variant="ghost" onClick={() => openEdit(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove(d)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edito Kodin" : "Kod i Ri"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="code">Kodi</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="SUMMER2026"
                  className="font-mono uppercase"
                />
                <Button type="button" variant="outline" onClick={() => set("code", randomCode())}>
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lloji</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => set("discount_type", v as "percentage" | "fixed")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Përqindje (%)</SelectItem>
                    <SelectItem value="fixed">Shumë fikse (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="val">Vlera</Label>
                <Input
                  id="val"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => set("discount_value", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start">Fillon më</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => set("start_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="exp">Skadon më</Label>
                <Input
                  id="exp"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => set("expires_at", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="max">Përdorime maksimale (opsionale)</Label>
              <Input
                id="max"
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => set("max_uses", e.target.value)}
                placeholder="Pa limit"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm font-medium">Aktiv</span>
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving} className="rounded-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Ruaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
