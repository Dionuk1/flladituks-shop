import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ImageOff,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Pencil,
  Loader2,
  Save,
  Upload,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  adminListProducts,
  adminUpdateProductStatus,
  adminDeleteProduct,
  adminUpdateProduct,
  adminUploadProductImage,
} from "@/lib/admin.functions";
import { requireToken } from "@/lib/admin-auth";
import { CATEGORIES, CONDITIONS, formatPrice } from "@/lib/cities";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produktet")({
  component: ProductsPage,
});

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  images: string[] | null;
  category: string | null;
  condition: string | null;
  stock: number;
  status: string;
  shipping_cost: number | null;
  cost_price: number | null;
};

const MAX_IMAGES = 3;

function ProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);

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
            Edito, menaxho stokun dhe shëno produktet si "E Shitur".
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
            const hasDiscount = p.old_price && Number(p.old_price) > Number(p.price);
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
                    {hasDiscount && (
                      <Badge className="rounded-full bg-destructive/90 text-destructive-foreground">
                        ZBRITJE
                      </Badge>
                    )}
                    {p.category && (
                      <Badge variant="outline" className="rounded-full text-xs">
                        {p.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(p.price)}
                    {hasDiscount ? (
                      <span className="ml-1 line-through">{formatPrice(p.old_price!)}</span>
                    ) : null}{" "}
                    · Stoku: {p.stock}
                    {p.shipping_cost ? ` · Transport: ${formatPrice(p.shipping_cost)}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(p)}
                  className="rounded-full"
                >
                  <Pencil className="mr-1 h-4 w-4" /> Edito
                </Button>
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

      <EditProductDialog
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin-products"] });
          qc.invalidateQueries({ queryKey: ["products"] });
        }}
      />
    </div>
  );
}

type ImgSlot = { id: string; preview: string; url: string; uploading: boolean };
const newId = () => Math.random().toString(36).slice(2);

function EditProductDialog({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("I ri");
  const [stock, setStock] = useState("0");
  const [images, setImages] = useState<ImgSlot[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!product) return;
    setTitle(product.title ?? "");
    setDescription(product.description ?? "");
    setPrice(String(product.price ?? ""));
    setCategory(product.category ?? "");
    setCondition(product.condition ?? "I ri");
    setStock(String(product.stock ?? 0));
    const urls =
      Array.isArray(product.images) && product.images.length
        ? product.images
        : product.image_url
          ? [product.image_url]
          : [];
    setImages(
      urls.slice(0, MAX_IMAGES).map((u) => ({
        id: newId(),
        preview: u,
        url: u,
        uploading: false,
      })),
    );
    setUrlInput("");
  }, [product]);

  // Revoke blob URLs on close
  useEffect(() => {
    return () => {
      for (const img of images) {
        if (img.preview.startsWith("blob:")) URL.revokeObjectURL(img.preview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files: FileList) {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Maksimumi ${MAX_IMAGES} foto`);
      return;
    }
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith("image/")) {
        toast.error("Vetëm foto janë të lejuara");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Foto më e madhe se 5MB");
        continue;
      }
      const id = newId();
      const preview = URL.createObjectURL(file);
      setImages((p) => [...p, { id, preview, url: "", uploading: true }]);
      try {
        const buf = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const dataBase64 = btoa(binary);
        const res = await adminUploadProductImage({
          data: {
            token: requireToken(),
            filename: file.name,
            contentType: file.type,
            dataBase64,
          },
        });
        setImages((p) =>
          p.map((s) => (s.id === id ? { ...s, url: res.url, uploading: false } : s)),
        );
      } catch (e: any) {
        toast.error("Ngarkimi dështoi", { description: e.message });
        setImages((p) => p.filter((s) => s.id !== id));
        URL.revokeObjectURL(preview);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function addUrl() {
    const u = urlInput.trim();
    if (!u) return;
    if (images.length >= MAX_IMAGES) {
      toast.error(`Maksimumi ${MAX_IMAGES} foto`);
      return;
    }
    try {
      new URL(u);
    } catch {
      toast.error("URL e pavlefshme");
      return;
    }
    setImages((p) => [...p, { id: newId(), preview: u, url: u, uploading: false }]);
    setUrlInput("");
  }

  function removeImage(id: string) {
    setImages((p) => {
      const img = p.find((s) => s.id === id);
      if (img && img.preview.startsWith("blob:")) URL.revokeObjectURL(img.preview);
      return p.filter((s) => s.id !== id);
    });
  }

  async function save() {
    if (!product) return;
    if (!title.trim()) {
      toast.error("Titulli është i nevojshëm");
      return;
    }
    if (!price || Number(price) < 0) {
      toast.error("Çmim i pavlefshëm");
      return;
    }
    if (images.some((i) => i.uploading)) {
      toast.error("Prit deri sa fotot të ngarkohen");
      return;
    }
    const urls = images.map((i) => i.url).filter((u): u is string => !!u);
    setSaving(true);
    try {
      await adminUpdateProduct({
        data: {
          token: requireToken(),
          id: product.id,
          product: {
            title: title.trim(),
            description: description.trim() || null,
            price: Number(price),
            category: category || null,
            condition,
            stock: Math.max(0, Math.floor(Number(stock) || 0)),
            image_url: urls[0] ?? null,
            images: urls,
          },
        },
      });
      toast.success("Ndryshimet u ruajtën me sukses!");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error("Gabim", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edito Produktin</DialogTitle>
          <DialogDescription>
            Përditëso çdo fushë — ndryshimi i çmimit në më të ulët ruan automatikisht çmimin e
            mëparshëm si "i vjetër".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="e-title">Titulli *</Label>
            <Input
              id="e-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="e-desc">Përshkrimi</Label>
            <Textarea
              id="e-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="e-price">Çmimi (€) *</Label>
              <Input
                id="e-price"
                type="number"
                step="0.01"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              {product && Number(price) < Number(product.price) && (
                <p className="mt-1 text-xs text-destructive">
                  Çmimi i mëparshëm ({formatPrice(product.price)}) do të kalojë te "çmimi i
                  vjetër".
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="e-stock">Stoku</Label>
              <Input
                id="e-stock"
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategoria</Label>
              <Select value={category} onValueChange={setCategory}>
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
              <Select value={condition} onValueChange={setCondition}>
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
            <Label>Fotot ({images.length}/{MAX_IMAGES})</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={images.length >= MAX_IMAGES}
                className="rounded-full"
              >
                <Upload className="mr-2 h-4 w-4" /> Ngarko Foto
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>

            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div
                    key={img.id}
                    className="relative h-20 w-20 overflow-hidden rounded-lg border bg-secondary"
                  >
                    <img src={img.preview} alt="" className="h-full w-full object-cover" />
                    {img.uploading && (
                      <div className="absolute inset-0 grid place-items-center bg-background/70">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-primary/90 text-center text-[10px] font-semibold text-primary-foreground">
                        Kryesore
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="ose ngjit URL: https://..."
              />
              <Button
                type="button"
                variant="outline"
                onClick={addUrl}
                disabled={!urlInput.trim() || images.length >= MAX_IMAGES}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Anulo
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Ruaj Ndryshimet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
