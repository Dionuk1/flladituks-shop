import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Store, Pencil, Plus, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminSellers } from "@/components/admin/product-extra-fields";
import {
  adminSaveSeller,
  adminSetFreeShippingBadge,
  getFreeShippingBadge,
} from "@/lib/admin.functions";
import { requireToken } from "@/lib/admin-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dyqanet")({
  head: () => ({ meta: [{ title: "Dyqanet — Admin FlladituKS" }] }),
  component: SellersPage,
});

function SellersPage() {
  const qc = useQueryClient();
  const { data: sellers = [], isLoading } = useAdminSellers();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showFree, setShowFree] = useState<boolean | null>(null);

  useEffect(() => {
    getFreeShippingBadge().then((r) => setShowFree(r.show)).catch(() => setShowFree(true));
  }, []);

  async function save(id: string | null, name: string) {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await adminSaveSeller({ data: { token: requireToken(), id, name: name.trim() } });
      toast.success(id ? "Emri i dyqanit u përditësua" : "Dyqani u shtua");
      setNewName("");
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
      qc.invalidateQueries({ queryKey: ["public-sellers"] });
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function toggleFree(v: boolean) {
    setShowFree(v);
    try {
      await adminSetFreeShippingBadge({ data: { token: requireToken(), show: v } });
      qc.invalidateQueries({ queryKey: ["free-ship-badge"] });
      toast.success(v ? "Badge-i “Dërgesë Falas” shfaqet" : "Badge-i “Dërgesë Falas” u fsheh");
    } catch (e: any) {
      setShowFree(!v);
      toast.error("Gabim", { description: e.message });
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dyqanet</h1>
        <p className="text-sm text-muted-foreground">
          Shto dhe edito dyqanet. Emri shfaqet poshtë fotos së produkteve të lidhura.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div className="min-w-0">
          <p className="font-semibold">Badge “Dërgesë Falas” në kartela</p>
          <p className="text-xs text-muted-foreground">
            Ndikon vetëm në shfaqje. Rregullat e transportit dhe pragu prej €25 mbeten të njëjta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="free-badge"
            checked={!!showFree}
            disabled={showFree === null}
            onCheckedChange={toggleFree}
          />
          <Label htmlFor="free-badge" className="w-8 text-sm font-semibold">
            {showFree ? "ON" : "OFF"}
          </Label>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(null, newName);
        }}
        className="flex flex-col gap-2 rounded-2xl border bg-card p-4 sm:flex-row"
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Emri i dyqanit të ri"
          maxLength={80}
        />
        <Button type="submit" disabled={busy || !newName.trim()}>
          <Plus className="mr-1 h-4 w-4" /> Shto dyqan
        </Button>
      </form>

      <div className="rounded-2xl border bg-card">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : sellers.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nuk ka dyqane ende.</p>
        ) : (
          <ul className="divide-y">
            {sellers.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                <Store className="h-5 w-5 shrink-0 text-primary" />
                {editId === s.id ? (
                  <form
                    className="flex min-w-0 flex-1 flex-wrap gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save(s.id, editName);
                    }}
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={80}
                      className="min-w-0 flex-1"
                      autoFocus
                    />
                    <Button type="submit" size="sm" disabled={busy}>
                      <Save className="mr-1 h-4 w-4" /> Ruaj
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.product_count} produkte</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(s.id);
                        setEditName(s.name);
                      }}
                    >
                      <Pencil className="mr-1 h-4 w-4" /> Edito
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
