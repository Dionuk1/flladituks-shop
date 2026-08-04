import { useMemo, useState } from "react";
import { KOSOVO_MAP_VIEWBOX, KOSOVO_MUNICIPALITY_SHAPES } from "@/lib/kosovo-map-data";
import { formatPrice } from "@/lib/cities";

export type CityStat = { city: string; total: number; delivered: number; revenue: number };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export function KosovoOrdersMap({ stats }: { stats: CityStat[] }) {
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);

  const byCity = useMemo(() => {
    const m = new Map<string, CityStat>();
    for (const s of stats) {
      const key = norm(s.city);
      const prev = m.get(key);
      if (prev) {
        prev.total += s.total;
        prev.delivered += s.delivered;
        prev.revenue += s.revenue;
      } else {
        m.set(key, { ...s });
      }
    }
    return m;
  }, [stats]);

  const lookup = (name: string): CityStat => {
    const direct = byCity.get(norm(name));
    if (direct) return direct;
    // tolerate aliases like "Drenas (Gllogoc)" vs "Drenas"
    for (const [key, val] of byCity) {
      if (norm(name).includes(key) || key.includes(norm(name))) return val;
    }
    return { city: name, total: 0, delivered: 0, revenue: 0 };
  };

  const max = useMemo(
    () => Math.max(1, ...KOSOVO_MUNICIPALITY_SHAPES.map((s) => lookup(s.name).total)),
    [byCity],
  );

  const fillFor = (total: number) => {
    if (total <= 0) return "var(--muted)";
    const pct = Math.round(18 + (total / max) * 72);
    return `color-mix(in oklab, var(--primary) ${pct}%, var(--muted))`;
  };

  const active = hover ? lookup(hover.name) : null;

  return (
    <div className="relative">
      <svg
        viewBox={KOSOVO_MAP_VIEWBOX}
        className="h-auto w-full"
        role="img"
        aria-label="Harta e porosive sipas komunave të Kosovës"
        onMouseLeave={() => setHover(null)}
      >
        {KOSOVO_MUNICIPALITY_SHAPES.map((m) => {
          const stat = lookup(m.name);
          return (
            <path
              key={m.name}
              d={m.d}
              fill={fillFor(stat.total)}
              stroke="var(--card)"
              strokeWidth={1.5}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseMove={(e) => {
                const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({
                  name: m.name,
                  x: e.clientX - box.left,
                  y: e.clientY - box.top,
                });
              }}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>

      {hover && active && (
        <div
          className="pointer-events-none absolute z-20 min-w-44 -translate-x-1/2 -translate-y-full rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg"
          style={{ left: hover.x, top: hover.y - 10 }}
        >
          <p className="text-sm font-semibold">{hover.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Porosi gjithsej: <span className="font-medium text-foreground">{active.total}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Të dorëzuara: <span className="font-medium text-foreground">{active.delivered}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Të ardhurat:{" "}
            <span className="font-medium text-primary">{formatPrice(active.revenue)}</span>
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Pak</span>
        <div className="h-2 flex-1 rounded-full bg-[linear-gradient(to_right,var(--muted),var(--primary))]" />
        <span>Shumë</span>
      </div>
    </div>
  );
}
