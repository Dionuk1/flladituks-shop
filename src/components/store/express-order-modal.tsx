import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuthUser } from "@/lib/notifications";
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
  first_name: z.string().trim().min(1, "Shkruaj emrin").max(60),
  last_name: z.string().trim().min(1, "Shkruaj mbiemrin").max(60),
  email: z.string().trim().email("Email i pavlefshëm").max(255),
  address: z.string().trim().min(4, "Shkruaj rrugën / adresën").max(255),
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
  const user = useAuthUser();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", city: "", phone: "", address: "" });
  useEffect(() => {
    if (!user) return;
    const full = String((user.user_metadata as any)?.full_name ?? "").trim();
    const [fn, ...rest] = full.split(/\s+/);
    setForm((p) => ({
      ...p,
      email: p.email || user.email || "",
      first_name: p.first_name || fn || "",
      last_name: p.last_name || rest.join(" "),
    }));
  }, [user]);
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
          customer_name: `${parsed.data.first_name} ${parsed.data.last_name}`,
          phone: parsed.data.phone,
          city: parsed.data.city,
          address: parsed.data.address,
          notes: `Porosi Express · Email: ${parsed.data.email}`,
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
        <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Porosit Tani
            </DialogTitle>
            <DialogDescription>
              {product.title} · <span className="font-semibold text-primary">{formatPrice(product.price)}</span>
            </DialogDescription>
          </DialogHeader>

          {!user ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Për të porositur duhet të kyçesh. Shporta jote ruhet.
              </p>
              <Button asChild size="lg" className="w-full rounded-full">
                <Link to="/auth" onClick={() => onOpenChange(false)}>Kyçu / Regjistrohu</Link>
              </Button>
            </div>
          ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ex-fn">Emri *</Label>
                <Input id="ex-fn" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="ex-ln">Mbiemri *</Label>
                <Input id="ex-ln" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="ex-email">Email *</Label>
              <Input id="ex-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ex-phone">Telefoni *</Label>
              <Input id="ex-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="044 123 456" required />
            </div>
            <div>
              <Label>Qyteti *</Label>
              <CitySelect value={form.city} onChange={(v) => set("city", v)} />
            </div>
            <div>
              <Label htmlFor="ex-addr">Rruga / Adresa *</Label>
              <Input id="ex-addr" value={form.address} onChange={(e) => set("address", e.target.value)} required />
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
