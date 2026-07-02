// EmailJS notification for new orders.
// Reads BOTH the admin notification email AND the EmailJS credentials from
// Supabase (app_settings). Falls back to VITE_EMAILJS_* env vars if config
// is not stored in the database.

import emailjs from "@emailjs/browser";
import { getNotificationEmail, getEmailJsConfig } from "@/lib/admin.functions";

type OrderItem = { id: string; title: string; price: number; quantity: number };

export type OrderNotificationPayload = {
  orderId: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  notes?: string | null;
  items: OrderItem[];
  total: number;
  shippingCost: number;
  paymentMethod?: string;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash_on_delivery: "Pagesë në Dorëzim (Cash on Delivery)",
  onefor: "OneFor (QR Code)",
  paysera: "Paysera (QR Code)",
};

function fmt(n: number) {
  return `${Number(n).toFixed(2)} €`;
}

export async function sendOrderNotification(payload: OrderNotificationPayload) {
  console.log("[EmailJS] sendOrderNotification start", { orderId: payload.orderId });

  let serviceId = "";
  let templateId = "";
  let publicKey = "";
  try {
    const cfg = await getEmailJsConfig();
    serviceId = cfg.serviceId || "";
    templateId = cfg.templateId || "";
    publicKey = cfg.publicKey || "";
    console.log("[EmailJS] config loaded", {
      hasService: !!serviceId,
      hasTemplate: !!templateId,
      hasKey: !!publicKey,
    });
  } catch (e) {
    console.error("[EmailJS] failed to load config from DB", e);
  }
  serviceId = serviceId || (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined) || "";
  templateId = templateId || (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined) || "";
  publicKey = publicKey || (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined) || "";

  if (!serviceId || !templateId || !publicKey) {
    console.error("[EmailJS] missing credentials — aborting");
    return { sent: false, reason: "emailjs_not_configured" as const };
  }

  let to_email: string | null = null;
  try {
    const r = await getNotificationEmail();
    to_email = r.email;
  } catch (e) {
    console.error("[EmailJS] failed to load notification email", e);
  }
  if (!to_email) {
    console.error("[EmailJS] no admin recipient email configured");
    return { sent: false, reason: "no_admin_email" as const };
  }

  const itemsText = payload.items
    .map((i) => `• ${i.title} × ${i.quantity} — ${fmt(i.price * i.quantity)}`)
    .join("\n");

  const templateParams = {
    to_email,
    email: to_email,
    reply_to: to_email,
    order_id: payload.orderId,
    customer_name: payload.customerName,
    phone: payload.phone,
    city: payload.city,
    address: payload.address,
    notes: payload.notes ?? "",
    items: itemsText,
    shipping_cost: fmt(payload.shippingCost),
    total: fmt(payload.total),
    payment_method: PAYMENT_LABELS[payload.paymentMethod ?? "cash_on_delivery"] ?? payload.paymentMethod ?? "",
    subject: `Porosi e re #${payload.orderId.slice(0, 8)} — ${payload.customerName}`,
  };

  console.log("[EmailJS] sending", { serviceId, templateId, to_email, order_id: payload.orderId });

  try {
    emailjs.init({ publicKey });
    const res = await emailjs.send(serviceId, templateId, templateParams, { publicKey });
    console.log("[EmailJS] sent OK", res);
    return { sent: true as const, res };
  } catch (e: any) {
    console.error("[EmailJS] send failed", {
      status: e?.status,
      text: e?.text,
      message: e?.message,
    });
    return {
      sent: false,
      reason: "send_failed" as const,
      error: e?.text || e?.message || String(e),
    };
  }
}
