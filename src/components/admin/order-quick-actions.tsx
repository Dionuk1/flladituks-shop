import { Phone, Printer, ArrowLeftRight } from "lucide-react";
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
 * Courier-style quick actions: call, print shipping label, switch status.
 */
export function OrderQuickActions({
  phone,
  status,
  onPrint,
  onStatusChange,
  className = "",
}: {
  phone?: string | null;
  status: string;
  onPrint: () => void;
  onStatusChange: (status: string) => void;
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
