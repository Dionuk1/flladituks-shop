import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, ImageOff, Upload, X, Plus } from "lucide-react";
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

const MAX_IMAGES = 3;

const empty = {
  title: "",
  description: "",
  price: "",
  category: "",
  condition: "I ri",
  stock: "1",
};

type ImgSlot = { id: string; preview: string; url: string | null; uploading: boolean };

function makeId() {
  return Math.random().toString(36).slice(2);
}

function AddProductPage() {
  const [form, setForm] = useState(empty);
  const [images, setImages] = useState<ImgSlot[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Revoke object URLs on unmount
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
    const list = Array.from(files).slice(0, remaining);
    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        toast.error("Vetëm foto janë të lejuara");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Foto më e madhe se 5MB");
        continue;
      }
      const id = makeId();
      const preview = URL.createObjectURL(file);
      setImages((p) => [...p, { id, preview, url: null, uploading: true }]);
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
    setImages((p) => [...p, { id: makeId(), preview: u, url: u, uploading: false }]);
    setUrlInput("");
  }

  function removeImage(id: string) {
    setImages((p) => {
      const img = p.find((s) => s.id === id);
      if (img && img.preview.startsWith("blob:")) URL.revokeObjectURL(img.preview);
      return p.filter((s) => s.id !== id);
    });
  }

  const previewUrl = images[0]?.preview ?? null;
  const uploadingAny = images.some((i) => i.uploading);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Titulli është i nevojshëm");
      if (!form.price || Number(form.price) < 0) throw new Error("Çmim i pavlefshëm");
      if (uploadingAny) throw new Error("Prit deri sa fotot të ngarkohen");
      const urls = images.map((i) => i.url).filter((u): u is string => !!u);
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
              image_url: urls[0] ?? null,
              images: urls,
              status: "available",
            },
          ],
        },
      });
    },
    onSuccess: () => {
      toast.success("Produkti u shtua me sukses!");
      for (const img of images) {
        if (img.preview.startsWith("blob:")) URL.revokeObjectURL(img.preview);
      }
      setForm(empty);
      setImages([]);
      setUrlInput("");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
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
            <Label>Foto e produktit (deri në {MAX_IMAGES})</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={images.length >= MAX_IMAGES}
                className="rounded-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Ngarko Foto
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
              <span className="text-xs text-muted-foreground">
                {images.length}/{MAX_IMAGES}
              </span>
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
                      aria-label="Hiq"
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
            <p className="mt-1 text-xs text-muted-foreground">
              Ngarko nga pajisja jote ose ngjit URL — foto e parë është kryesore.
            </p>
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending || uploadingAny}
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
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={form.title || "Produkt"}
                  className="h-full w-full object-cover"
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
                  <p className="whitespace-nowrap text-lg font-bold text-primary">
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
