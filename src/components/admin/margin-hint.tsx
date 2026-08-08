import { formatPrice } from "@/lib/cities";

/**
 * Live profit-margin preview for the product forms.
 * Margin % = (selling - cost) / selling * 100
 */
export function MarginHint({
  cost,
  price,
  className = "",
}: {
  cost: string | number;
  price: string | number;
  className?: string;
}) {
  const c = Number(cost) || 0;
  const p = Number(price) || 0;
  if (!p || !c) return null;

  const profit = p - c;
  const pct = (profit / p) * 100;
  const tone =
    profit <= 0 ? "text-destructive" : pct < 15 ? "text-foreground" : "text-success";

  return (
    <div className={`rounded-xl border bg-secondary/40 px-3 py-2 text-sm ${className}`}>
      <span className="text-muted-foreground">Marzha e parashikuar: </span>
      <span className={`font-bold ${tone}`}>
        {pct.toFixed(1)}% · {formatPrice(profit)}
      </span>
      {profit <= 0 && (
        <span className="ml-1 text-xs text-destructive">(shitje me humbje!)</span>
      )}
    </div>
  );
}
