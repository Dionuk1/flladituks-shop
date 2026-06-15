import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, ImageOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, CONDITIONS, formatPrice } from "@/lib/cities";
import { adminInsertProducts, adminUploadProductImage } from "@/lib/admin.functions";
import { requireToken } from "@/lib/admin-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shto")({
  component: AddProductPage,
});

const empty = {
  title: "",
  description: "",
  price: "",
  category: "",
  condition: "I ri",
  stock: "1",
  image_url: "",
};

function AddProductPage() {
  const [form, setForm] = useState(empty);
  const qc = useQueryClient();
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Titulli është i nevojshëm");
      if (!form.price || Number(form.price) < 0) throw new Error("Çmim i pavlefshëm");
      await adminInsertProducts({
        data: {
          token: requireToken(),
          products: [
            {
              title: form.title.trim(),
              description: form.description.trim() || null,
              price: Number(form.price),
              category: form.category || null,
              condition: form.condition,
              stock: Number(form.stock) || 0,
              image_url: form.image_url.trim() || null,
              status: "available",
            },
          ],
        },
      });
    },
    onSuccess: () => {
      toast.success("Produkti u shtua me sukses!");
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error("Gabim", { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shto Produkt të Ri</h1>
        <p className="text-sm text-muted-foreground">
          Plotëso të dhënat — paraqitja përditësohet menjëherë në të djathtë.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm"
        >
          <div>
            <Label htmlFor="title">Titulli *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="P.sh. Bluzë verore për femra"
              required
            />
          </div>

          <div>
            <Label htmlFor="desc">Përshkrimi</Label>
            <Textarea
              id="desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Detaje rreth produktit..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">Çmimi (€) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min={0}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="stock">Sasia në stok</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategoria</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Zgjidh" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gjendja</Label>
              <Select value={form.condition} onValueChange={(v) => set("condition", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="img">URL e Fotos</Label>
            <Input
              id="img"
              type="url"
              value={form.image_url}
              onChange={(e) => set("image_url", e.target.value)}
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ngjit një URL të fotos nga interneti.
            </p>
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-full"
            size="lg"
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Ruaj Produktin
          </Button>
        </form>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Paraqitje paraprake</p>
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="relative aspect-square bg-secondary">
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt={form.title || "Produkt"}
                  className="h-full w-full object-cover"
                  onError={(e) => ((e.currentTarget.style.display = "none"))}
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground">
                  <ImageOff className="h-12 w-12" />
                </div>
              )}
              <div className="absolute left-2 top-2 flex gap-1">
                {form.category && (
                  <Badge variant="secondary" className="bg-card/90 rounded-full text-xs">
                    {form.category}
                  </Badge>
                )}
                {form.condition && (
                  <Badge variant="outline" className="bg-card/90 rounded-full text-xs">
                    {form.condition}
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2 p-4">
              <h3 className="font-semibold">{form.title || "Titulli i produktit"}</h3>
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {form.description || "Përshkrimi do të shfaqet këtu..."}
              </p>
              <div className="flex items-end justify-between pt-2">
                <div>
                  <p className="text-lg font-bold text-primary">
                    {formatPrice(form.price || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(form.stock) > 0 ? `${form.stock} në stok` : "Pa stok"}
                  </p>
                </div>
                <Button size="sm" disabled className="rounded-full">
                  Shto në shportë
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
