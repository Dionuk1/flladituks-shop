import { useState } from "react";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
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
import { useCart } from "@/lib/cart";
import { KOSOVO_CITIES, formatPrice } from "@/lib/cities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  customer_name: z.string().trim().min(2, "Emër i pavlefshëm").max(120),
  phone: z
    .string()
    .trim()
    .min(6, "Numër i pavlefshëm")
    .max(20)
    .regex(/^[0-9 +\-()]+$/, "Vetëm numra dhe simbole tel."),
  city: z.string().min(1, "Zgjidh qytetin"),
  address: z.string().trim().min(4, "Adresë e pavlefshme").max(255),
  notes: z.string().max(500).optional(),
});

export function CheckoutForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { items, total, clear } = useCart();
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Gabim në formë", { description: parsed.error.issues[0]?.message });
      return;
    }
    if (items.length === 0) {
      toast.error("Shporta është bosh");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      customer_name: parsed.data.customer_name,
      phone: parsed.data.phone,
      city: parsed.data.city,
      address: parsed.data.address,
      notes: parsed.data.notes || null,
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
      })),
      total,
      payment_method: "cash_on_delivery",
      status: "new",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Gabim gjatë porositjes", { description: error.message });
      return;
    }
    setSuccess(true);
    clear();
    toast.success("Porosia u krye me sukses!", {
      description: "Do t'ju kontaktojmë së shpejti për konfirmim.",
    });
    setTimeout(() => {
      setSuccess(false);
      onDone();
    }, 1800);
  }

  if (success) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-success" />
        <h3 className="mt-4 text-xl font-bold">Porosia u krye me sukses!</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Faleminderit që zgjodhët FlladituKS. Do t'ju kontaktojmë së shpejti.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex-1 space-y-4 p-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kthehu te shporta
        </button>

        <div>
          <Label htmlFor="name">Emri dhe Mbiemri *</Label>
          <Input
            id="name"
            value={form.customer_name}
            onChange={(e) => set("customer_name", e.target.value)}
            placeholder="P.sh. Filan Fisteku"
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">Numri i Telefonit *</Label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="044 123 456"
            required
          />
        </div>

        <div>
          <Label>Qyteti *</Label>
          <Select value={form.city} onValueChange={(v) => set("city", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Zgjidh qytetin" />
            </SelectTrigger>
            <SelectContent>
              {KOSOVO_CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="address">Adresa e Dorëzimit *</Label>
          <Textarea
            id="address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Rruga, numri, lagja..."
            rows={2}
            required
          />
        </div>

        <div>
          <Label htmlFor="notes">Shënime (opsionale)</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Diçka që duhet të dimë?"
            rows={2}
          />
        </div>

        <div className="rounded-xl border bg-secondary/40 p-3 text-sm">
          <p className="font-medium">Mënyra e pagesës</p>
          <p className="mt-1 text-muted-foreground">
            💵 Pagesa në dorë (Cash on Delivery)
          </p>
        </div>
      </div>

      <footer className="border-t bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-muted-foreground">Totali për pagesë</span>
          <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
        </div>
        <Button type="submit" disabled={submitting} className="w-full rounded-full" size="lg">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Konfirmo porosinë
        </Button>
      </footer>
    </form>
  );
}
