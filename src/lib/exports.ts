import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatPrice, statusLabel } from "@/lib/cities";

type OrderLike = {
  id: string;
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  total: number;
  shipping_cost: number;
  status: string;
  created_at: string;
  items?: Array<{ title: string; price: number; quantity: number }>;
  tracking_number?: string | null;
  notes?: string | null;
};

export function exportOrdersToExcel(
  orders: OrderLike[],
  fin: { gross: number; shippingCosts: number; net: number; orders: number } | undefined,
) {
  const rows = orders.map((o) => ({
    "Numri i porosisë": o.id,
    "Data": new Date(o.created_at).toLocaleString("sq"),
    "Klienti": o.customer_name,
    "Telefoni": o.phone,
    "Qyteti": o.city,
    "Adresa": o.address,
    "Produktet": (o.items ?? []).map((i) => `${i.quantity}× ${i.title}`).join(", "),
    "Totali (€)": Number(o.total ?? 0),
    "Kosto e Postës (€)": Number(o.shipping_cost ?? 0),
    "Statusi": statusLabel(o.status),
    "Tracking": o.tracking_number ?? "",
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Porositë");

  if (fin) {
    const summary = [
      { Treguesi: "Numri i porosive të konfirmuara", Vlera: fin.orders },
      { Treguesi: "Xhiroja Bruto (€)", Vlera: Number(fin.gross.toFixed(2)) },
      { Treguesi: "Kostot e Postës (€)", Vlera: Number(fin.shippingCosts.toFixed(2)) },
      { Treguesi: "Fitimi Neto (€)", Vlera: Number(fin.net.toFixed(2)) },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Përmbledhje");
  }
  XLSX.writeFile(wb, `FlladituKS-Raport-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportFinancialsToPDF(
  fin: { gross: number; shippingCosts: number; net: number; orders: number; shippingPrice: number },
  orders: OrderLike[],
) {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(20, 100, 180);
  doc.text("FlladituKS", 14, 18);
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text("Raporti Financiar", 14, 26);
  doc.setFontSize(10);
  doc.text(`Gjeneruar: ${new Date().toLocaleString("sq")}`, 14, 32);

  autoTable(doc, {
    startY: 40,
    head: [["Treguesi", "Vlera"]],
    body: [
      ["Porosi të konfirmuara", String(fin.orders)],
      ["Xhiroja Bruto", formatPrice(fin.gross)],
      ["Kostot e Postës", formatPrice(fin.shippingCosts)],
      ["Fitimi Neto", formatPrice(fin.net)],
      ["Çmimi aktual i postës", formatPrice(fin.shippingPrice)],
    ],
    theme: "grid",
    headStyles: { fillColor: [20, 100, 180] },
  });

  const confirmed = orders.filter((o) => ["processing", "shipped", "completed"].includes(o.status));
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [["Data", "Klienti", "Qyteti", "Totali", "Statusi"]],
    body: confirmed.slice(0, 50).map((o) => [
      new Date(o.created_at).toLocaleDateString("sq"),
      o.customer_name,
      o.city,
      formatPrice(o.total),
      statusLabel(o.status),
    ]),
    theme: "striped",
    headStyles: { fillColor: [20, 100, 180] },
  });

  doc.save(`FlladituKS-Financa-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportInvoiceToPDF(o: OrderLike) {
  const doc = new jsPDF();
  doc.setFontSize(22);
  doc.setTextColor(20, 100, 180);
  doc.text("FlladituKS", 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text("Faturë Dixhitale", 14, 27);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Porosia: ${o.id}`, 14, 34);
  doc.text(`Data: ${new Date(o.created_at).toLocaleString("sq")}`, 14, 39);
  doc.text(`Statusi: ${statusLabel(o.status)}`, 14, 44);
  if (o.tracking_number) doc.text(`Tracking: ${o.tracking_number}`, 14, 49);

  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text("Të dhënat e dërgesës:", 14, 60);
  doc.setFontSize(10);
  doc.text(`${o.customer_name}`, 14, 66);
  doc.text(`Tel: ${o.phone}`, 14, 71);
  doc.text(`${o.city} · ${o.address}`, 14, 76);

  const items = o.items ?? [];
  autoTable(doc, {
    startY: 84,
    head: [["Produkti", "Sasia", "Çmimi", "Totali"]],
    body: items.map((it) => [
      it.title,
      String(it.quantity),
      formatPrice(it.price),
      formatPrice(Number(it.price) * Number(it.quantity)),
    ]),
    theme: "grid",
    headStyles: { fillColor: [20, 100, 180] },
  });

  const itemsTotal = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
  const y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.text(`Nëntotali: ${formatPrice(itemsTotal)}`, 140, y);
  doc.text(`Transporti: ${o.shipping_cost === 0 ? "Falas" : formatPrice(o.shipping_cost)}`, 140, y + 5);
  doc.setFontSize(13);
  doc.setTextColor(20, 100, 180);
  doc.text(`TOTALI: ${formatPrice(o.total)}`, 140, y + 13);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Faleminderit që zgjodhët FlladituKS!", 14, 285);

  doc.save(`FlladituKS-Fatura-${o.id.slice(0, 8)}.pdf`);
}

export function buildWhatsAppLink(o: OrderLike) {
  const phone = String(o.phone ?? "").replace(/[^\d]/g, "");
  // Try to normalize to international format for Kosovo (+383) if it starts with 0
  const intl = phone.startsWith("0") ? `383${phone.slice(1)}` : phone;
  const products = (o.items ?? []).map((i) => `• ${i.quantity}× ${i.title}`).join("\n");
  const msg =
    `Përshëndetje ${o.customer_name}! 👋\n\n` +
    `Porosia juaj në *FlladituKS* është nisur për dorëzim:\n\n` +
    `${products}\n\n` +
    `Totali për pagesë: *${formatPrice(o.total)}*\n` +
    `Adresa: ${o.city}, ${o.address}\n` +
    (o.tracking_number ? `Fletëgarkesa: ${o.tracking_number}\n` : "") +
    `\nFaleminderit që blet te FlladituKS! 🛍️`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

/** Normalize a Kosovo phone number to international format for wa.me links. */
export function normalizePhone(phone: string | null | undefined) {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("383")) return digits;
  if (digits.startsWith("0")) return `383${digits.slice(1)}`;
  return digits;
}

/** Quick "order shipped" WhatsApp message for the table quick actions. */
export function buildShippedWhatsAppLink(o: {
  phone: string;
  customer_name: string;
  order_no?: number | null;
  id: string;
}) {
  const code =
    o.order_no != null ? `#${o.order_no}` : `#${String(o.id).slice(0, 6).toUpperCase()}`;
  const msg =
    `Përshëndetje ${o.customer_name}, porosia juaj ${code} është nisur me postë ` +
    `dhe pritet t'ju arrijë së shpejti! Faleminderit nga FlladituKS.`;
  return `https://wa.me/${normalizePhone(o.phone)}?text=${encodeURIComponent(msg)}`;
}

/** Clean export formatted for local courier companies. */
export function exportOrdersForCourier(orders: OrderLike[], scopeLabel = "Te-gjitha") {
  const rows = orders.map((o: any) => ({
    "ID e Porosisë": o.order_no != null ? `#${o.order_no}` : `#${String(o.id).slice(0, 6).toUpperCase()}`,
    "Emri i Plotë": o.customer_name,
    "Numri i Telefonit": o.phone,
    "Qyteti": o.city,
    "Adresa e Plotë": o.address,
    "Produktet": (o.items ?? []).map((i: any) => `${i.quantity}× ${i.title}`).join(", "),
    "Shuma për Arkëtim (COD €)": Number(o.total ?? 0),
    "Statusi": statusLabel(o.status),
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 40 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "Posta");
  XLSX.writeFile(
    wb,
    `FlladituKS-Posta-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
