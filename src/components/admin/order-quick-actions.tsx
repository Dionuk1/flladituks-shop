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

/**
 * Courier-style quick actions: call, WhatsApp, print shipping label, switch status.
 */
export function OrderQuickActions({
  phone,
  status,
  onPrint,
  onStatusChange,
  whatsappHref,
  className = "",
}: {
  phone?: string | null;
  status: string;
  onPrint: () => void;
  onStatusChange: (status: string) => void;
  whatsappHref?: string;
  className?: string;
}) {
  const tel = String(phone ?? "").replace(/[^\d+]/g, "");
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
        title="Dërgo mesazh në WhatsApp"
        aria-label="Dërgo mesazh në WhatsApp"
        disabled={!whatsappHref}
        asChild={!!whatsappHref}
      >
        {whatsappHref ? (
          <a href={whatsappHref} target="_blank" rel="noreferrer">
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
