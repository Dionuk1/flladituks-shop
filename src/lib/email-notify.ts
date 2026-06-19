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
};

function fmt(n: number) {
  return `${Number(n).toFixed(2)} €`;
}

export async function sendOrderNotification(payload: OrderNotificationPayload) {
  // 1) Pick up EmailJS credentials — DB first, env as fallback.
  let serviceId = "";
  let templateId = "";
  let publicKey = "";
  try {
    const cfg = await getEmailJsConfig();
    serviceId = cfg.serviceId || "";
    templateId = cfg.templateId || "";
    publicKey = cfg.publicKey || "";
  } catch {
    // ignore — fall back to env
  }
  serviceId = serviceId || (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined) || "";
  templateId = templateId || (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined) || "";
  publicKey = publicKey || (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined) || "";

  if (!serviceId || !templateId || !publicKey) {
    return { sent: false, reason: "emailjs_not_configured" as const };
  }

  // 2) Pick up the recipient (admin notification email).
  let to_email: string | null = null;
  try {
    const r = await getNotificationEmail();
    to_email = r.email;
  } catch {
    // fallthrough
  }
  if (!to_email) {
    return { sent: false, reason: "no_admin_email" as const };
  }

  const itemsText = payload.items
    .map((i) => `• ${i.title} × ${i.quantity} — ${fmt(i.price * i.quantity)}`)
    .join("\n");

  const templateParams = {
    to_email,
    order_id: payload.orderId,
    customer_name: payload.customerName,
    phone: payload.phone,
    city: payload.city,
    address: payload.address,
    notes: payload.notes ?? "",
    items: itemsText,
    shipping_cost: fmt(payload.shippingCost),
    total: fmt(payload.total),
    subject: `Porosi e re #${payload.orderId.slice(0, 8)} — ${payload.customerName}`,
  };

  try {
    await emailjs.send(serviceId, templateId, templateParams, { publicKey });
    return { sent: true as const };
  } catch (e: any) {
    console.error("EmailJS send failed", e);
    return { sent: false, reason: "send_failed" as const, error: e?.message };
  }
}
