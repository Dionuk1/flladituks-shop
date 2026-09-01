import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CitySelect } from "@/components/ui/city-select";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/cities";
import { createOrder, getShippingPrice, validateDiscountCode } from "@/lib/admin.functions";
import { sendOrderNotification } from "@/lib/email-notify";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { OrderSuccessOverlay } from "./order-success";
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

const FREE_SHIPPING_THRESHOLD = 25;

export function CheckoutForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { items, total: itemsTotal, clear } = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });
  const paymentMethod = "cash_on_delivery" as const;
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useI18n();
  const [shippingPrice, setShippingPrice] = useState(2.0);
  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [promo, setPromo] = useState<{ code: string; amount: number } | null>(null);

  useEffect(() => {
    getShippingPrice().then((r) => setShippingPrice(r.price)).catch(() => {});
  }, []);

  // Re-validate the applied code whenever the cart subtotal changes.
  useEffect(() => {
    if (!promo) return;
    let cancelled = false;
    validateDiscountCode({ data: { code: promo.code, subtotal: itemsTotal } })
      .then((r) => {
        if (cancelled) return;
        if (r.valid) setPromo({ code: r.code, amount: r.amount });
        else setPromo(null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsTotal]);

  const discountAmount = promo ? Math.min(promo.amount, itemsTotal) : 0;
  const shippingCost = itemsTotal > FREE_SHIPPING_THRESHOLD ? 0 : shippingPrice;
  const total = Math.max(0, itemsTotal - discountAmount) + shippingCost;

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoChecking(true);
    try {
      const res = await validateDiscountCode({ data: { code, subtotal: itemsTotal } });
      if (res.valid) {
        setPromo({ code: res.code, amount: res.amount });
        toast.success(`Kodi ${res.code} u aplikua!`);
      } else {
        setPromo(null);
        toast.error(res.error);
      }
    } catch (e: any) {
      toast.error("Gabim gjatë verifikimit", { description: e?.message });
    } finally {
      setPromoChecking(false);
    }
  }

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
    try {
      const res = await createOrder({
        data: {
          customer_name: parsed.data.customer_name,
          phone: parsed.data.phone,
          city: parsed.data.city,
          address: parsed.data.address,
          notes: parsed.data.notes || null,
          payment_method: paymentMethod,
          items: items.map((i) => ({
            id: i.id,
            title: i.title,
            price: i.price,
            quantity: i.quantity,
          })),
        },
      });
      clear();
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Porosia u krye me sukses!");
      // Send admin email notification — awaited so failures surface in console + toast.
      try {
        const emailRes = await sendOrderNotification({
          orderId: res.id,
          orderNo: res.order_no ?? null,
          customerName: parsed.data.customer_name,
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
          shippingCost,
          paymentMethod,
        });
        if (!emailRes.sent) {
          console.error("[Checkout] email notification not sent:", emailRes);
          toast.warning("Porosia u ruajt, por njoftimi me email dështoi", {
            description:
              ("error" in emailRes && emailRes.error) || emailRes.reason,
          });
        }
      } catch (mailErr: any) {
        console.error("[Checkout] sendOrderNotification threw:", mailErr);
        toast.warning("Njoftimi me email dështoi", {
          description: mailErr?.message,
        });
      }
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 1900));
      onDone();
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
    <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex-1 space-y-4 p-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("checkout.back")}
        </button>

        <div>
          <Label htmlFor="name">{t("checkout.name")}</Label>
          <Input
            id="name"
            value={form.customer_name}
            onChange={(e) => set("customer_name", e.target.value)}
            placeholder="P.sh. Filan Fisteku"
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">{t("checkout.phone")}</Label>
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
          <Label>{t("checkout.city")}</Label>
          <CitySelect value={form.city} onChange={(v) => set("city", v)} />
        </div>

        <div>
          <Label htmlFor="address">{t("checkout.address")}</Label>
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
          <Label htmlFor="notes">{t("checkout.notes")}</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Diçka që duhet të dimë?"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("checkout.payment")}</Label>
          <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-3 text-sm ring-1 ring-primary">
            <span className="text-lg">💵</span>
            <span className="flex-1">
              <span className="block font-medium">{t("checkout.cod")}</span>
              <span className="block text-xs text-muted-foreground">
                {t("checkout.codSub")}
              </span>
            </span>
          </div>
        </div>


      </div>

      <footer className="space-y-2 border-t bg-card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("checkout.subtotal")}</span>
          <span>{formatPrice(itemsTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("checkout.shipping")}</span>
          <span className={shippingCost === 0 ? "font-semibold text-success" : ""}>
            {shippingCost === 0 ? t("checkout.free") : formatPrice(shippingCost)}
          </span>
        </div>
        {itemsTotal <= FREE_SHIPPING_THRESHOLD && (
          <p className="text-xs text-muted-foreground">
            Transporti falas për porositë mbi {formatPrice(FREE_SHIPPING_THRESHOLD)}.
          </p>
        )}
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-muted-foreground">{t("checkout.totalPay")}</span>
          <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
        </div>
        <Button type="submit" disabled={submitting} className="w-full rounded-full transition-transform duration-200 hover:scale-[1.02] active:scale-95" size="lg">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t("checkout.confirm")}
        </Button>
      </footer>
    </form>
    </>
  );
}
