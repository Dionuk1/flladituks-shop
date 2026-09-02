import { Phone, Printer, ArrowLeftRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ORDER_STATUSES, statusLabel } from "@/lib/cities";
import { buildShippedWhatsAppLink, normalizePhone } from "@/lib/exports";

/**
 * Courier-style quick actions: call, WhatsApp, print shipping label, switch status.
 */
export function OrderQuickActions({
  phone,
  status,
  onPrint,
  onStatusChange,
  whatsappHref,
  customerName,
  orderNo,
  orderId,
  message,
  className = "",
}: {
  phone?: string | null;
  status: string;
  onPrint: () => void;
  onStatusChange: (status: string) => void;
  /** Optional override. If omitted, the link is built from phone/customer/order data. */
  whatsappHref?: string;
  customerName?: string;
  orderNo?: number | null;
  orderId?: string;
  /** Optional custom WhatsApp message. If omitted, a shipped-order template is used. */
  message?: string;
  className?: string;
}) {
  const rawPhone = String(phone ?? "").trim();
  const tel = rawPhone.replace(/[^\d+]/g, "");

  const waHref =
    whatsappHref ??
    (rawPhone
      ? buildShippedWhatsAppLink({
          phone: rawPhone,
          customer_name: customerName ?? "",
          order_no: orderNo,
          id: orderId ?? "",
        })
      : "");

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8 rounded-full"
        title={tel ? `Telefono ${phone}` : "Pa numër telefoni"}
        aria-label="Telefono klientin"
        disabled={!tel}
        asChild={!!tel}
      >
        {tel ? (
          <a href={`tel:${tel}`}>
            <Phone className="h-4 w-4" />
          </a>
        ) : (
          <Phone className="h-4 w-4" />
        )}
      </Button>

      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8 rounded-full border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
        title={waHref ? "Dërgo mesazh në WhatsApp" : "Pa numër telefoni për WhatsApp"}
        aria-label="Dërgo mesazh në WhatsApp"
        disabled={!waHref}
        asChild={!!waHref}
        onClick={(e) => {
          if (!waHref) return;
          // Normalize the number for logging/debugging and ensure the href is well-formed.
          const clean = normalizePhone(rawPhone);
          if (!clean) {
            e.preventDefault();
            return;
          }
          // Allow the anchor to open https://wa.me/<number> in a new tab as usual.
          window.open(waHref, "_blank", "noopener,noreferrer");
        }}
      >
        {waHref ? (
          <a href={waHref} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" />
          </a>
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
      </Button>

      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8 rounded-full"
        title="Printo etiketën e dërgesës"
        aria-label="Printo etiketën"
        onClick={onPrint}
      >
        <Printer className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full"
            title={`Ndrysho statusin (${statusLabel(status)})`}
            aria-label="Ndrysho statusin"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ndrysho statusin</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ORDER_STATUSES.map((s) => (
            <DropdownMenuItem
              key={s.value}
              onClick={() => onStatusChange(s.value)}
              className={s.value === status ? "font-semibold text-primary" : ""}
            >
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
