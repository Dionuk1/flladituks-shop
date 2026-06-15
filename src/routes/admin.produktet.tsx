import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Trash2, Search, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminListProducts,
  adminUpdateProductStatus,
  adminDeleteProduct,
} from "@/lib/admin.functions";
import { requireToken } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/cities";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produktet")({
  component: ProductsPage,
});

type Product = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  category: string | null;
  stock: number;
  status: string;
  shipping_cost: number | null;
};

function ProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const rows = await adminListProducts({ data: { token: requireToken() } });
      return rows as unknown as Product[];
    },
  });

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        q ? p.title.toLowerCase().includes(q.toLowerCase()) : true,
      ),
    [products, q],
  );

  async function setStatus(id: string, status: "available" | "sold") {
    try {
      await adminUpdateProductStatus({ data: { token: requireToken(), id, status } });
      toast.success(status === "sold" ? "U shënua si E SHITUR" : "U shënua Në Stok");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
    }
  }

  async function remove(id: string) {
    if (!confirm("Të fshihet ky produkt?")) return;
    try {
      await adminDeleteProduct({ data: { token: requireToken(), id } });
      toast.success("Produkti u fshi");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Produktet</h1>
          <p className="text-sm text-muted-foreground">
            Menaxho stokun dhe shëno produktet si "E Shitur".
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-1.5 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kërko produkt..."
            className="w-64 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          Nuk u gjet asnjë produkt.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const sold = p.status === "sold";
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm"
              >
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="line-clamp-1 font-medium">{p.title}</p>
                    {sold ? (
                      <Badge className="rounded-full bg-destructive text-destructive-foreground">
                        E SHITUR
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="rounded-full">
                        Në stok
                      </Badge>
                    )}
                    {p.category && (
                      <Badge variant="outline" className="rounded-full text-xs">
                        {p.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(p.price)} · Stoku: {p.stock}
                    {p.shipping_cost ? ` · Transport: ${formatPrice(p.shipping_cost)}` : ""}
                  </p>
                </div>
                <Select
                  value={sold ? "sold" : "available"}
                  onValueChange={(v) => setStatus(p.id, v as "available" | "sold")}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" /> Në Stok
                      </span>
                    </SelectItem>
                    <SelectItem value="sold">
                      <span className="inline-flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" /> E Shitur
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(p.id)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
