import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Zap, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CitySelect } from "@/components/ui/city-select";
import { formatPrice } from "@/lib/cities";
import { createOrder } from "@/lib/admin.functions";
import { toast } from "sonner";
import { z } from "zod";
import { OrderSuccessOverlay } from "./order-success";

const schema = z.object({
  customer_name: z.string().trim().min(2, "Shkruaj emrin dhe mbiemrin").max(120),
  city: z.string().min(1, "Zgjidh qytetin"),
  phone: z
    .string()
    .trim()
    .min(6, "Numër i pavlefshëm")
    .max(20)
    .regex(/^[0-9 +\-()]+$/, "Vetëm numra dhe simbole telefoni"),
});

export function ExpressOrderModal({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: { id: string; title: string; price: number };
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ customer_name: "", city: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Të dhëna të pavlefshme");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createOrder({
        data: {
          customer_name: parsed.data.customer_name,
          phone: parsed.data.phone,
          city: parsed.data.city,
          address: "Express — adresa merret me telefon",
          notes: "Porosi Express nga faqja e produktit",
          payment_method: "cash_on_delivery",
          items: [
            {
              id: product.id,
              title: product.title,
              price: Number(product.price),
              quantity: 1,
            },
          ],
        },
      });
      qc.invalidateQueries({ queryKey: ["products"] });
      setSuccess(true);
      toast.success("Porosia u dërgua!", { description: "Do të kontaktohesh së shpejti." });
      await new Promise((r) => setTimeout(r, 1700));
      onOpenChange(false);
      navigate({ to: "/porosia/$id", params: { id: res.id } });
    } catch (err: any) {
      toast.error("Gabim gjatë porositjes", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {success && <OrderSuccessOverlay />}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Porosit Tani
            </DialogTitle>
            <DialogDescription>
              {product.title} · <span className="font-semibold text-primary">{formatPrice(product.price)}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="ex-name">Emri & Mbiemri *</Label>
              <Input
                id="ex-name"
                value={form.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
                placeholder="P.sh. Filan Fisteku"
                required
              />
            </div>
            <div>
              <Label>Qyteti *</Label>
              <CitySelect value={form.city} onChange={(v) => set("city", v)} />
            </div>
            <div>
              <Label htmlFor="ex-phone">Numri i Telefonit *</Label>
              <Input
                id="ex-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="044 123 456"
                required
              />
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-secondary/70 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Kontrolloni pakon te dera me postierin para pagesës.
            </p>

            <Button type="submit" size="lg" disabled={submitting} className="w-full rounded-full">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Konfirmo porosinë
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
