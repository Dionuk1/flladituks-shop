import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminListSellers } from "@/lib/admin.functions";
import { requireToken } from "@/lib/admin-auth";

const NONE = "none";

export function useAdminSellers() {
  return useQuery({
    queryKey: ["admin-sellers"],
    queryFn: () => adminListSellers({ data: { token: requireToken() } }),
  });
}

/** Store + delivery-time dropdowns shared by the Add and Edit product forms. */
export function ProductExtraFields({
  sellerId,
  onSellerChange,
  delivery,
  onDeliveryChange,
}: {
  sellerId: string | null;
  onSellerChange: (v: string | null) => void;
  delivery: "24h" | "48h" | null;
  onDeliveryChange: (v: "24h" | "48h" | null) => void;
}) {
  const { data: sellers = [] } = useAdminSellers();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="min-w-0">
        <Label>Dyqani</Label>
        <Select
          value={sellerId ?? NONE}
          onValueChange={(v) => onSellerChange(v === NONE ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pa dyqan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Pa dyqan</SelectItem>
            {sellers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0">
        <Label>Dërgesa</Label>
        <Select
          value={delivery ?? NONE}
          onValueChange={(v) => onDeliveryChange(v === NONE ? null : (v as "24h" | "48h"))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pa caktuar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Pa caktuar</SelectItem>
            <SelectItem value="24h">24 orë</SelectItem>
            <SelectItem value="48h">48 orë</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
