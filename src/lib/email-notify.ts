// EmailJS notification for new orders.
// Reads the admin's notification email from Supabase (app_settings) and sends
// a notification via EmailJS using publishable VITE_EMAILJS_* env vars.
//
// Required env vars (publishable — safe to expose):
//   VITE_EMAILJS_SERVICE_ID
//   VITE_EMAILJS_TEMPLATE_ID
//   VITE_EMAILJS_PUBLIC_KEY
//
// If any of these are missing, the call is a silent no-op so checkout never
// breaks because of email config issues.

import emailjs from "@emailjs/browser";
import { getNotificationEmail } from "@/lib/admin.functions";

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
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

  if (!serviceId || !templateId || !publicKey) {
    // EmailJS not configured yet — skip silently.
    return { sent: false, reason: "emailjs_not_configured" as const };
  }

  let to_email: string | null = null;
  try {
    const r = await getNotificationEmail();
    to_email = r.email;
  } catch {
    // fallthrough — handled below
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
    // Don't break checkout if email fails.
    console.error("EmailJS send failed", e);
    return { sent: false, reason: "send_failed" as const, error: e?.message };
  }
}
