export const KOSOVO_CITIES = [
  "Prishtinë",
  "Prizren",
  "Ferizaj",
  "Pejë",
  "Gjakovë",
  "Gjilan",
  "Mitrovicë",
  "Podujevë",
  "Vushtrri",
  "Suharekë",
  "Rahovec",
  "Drenas (Gllogoc)",
  "Skenderaj",
  "Malishevë",
  "Deçan",
  "Klinë",
  "Kamenicë",
  "Dragash",
  "Istog",
  "Viti",
  "Kaçanik",
  "Hani i Elezit",
  "Fushë Kosovë",
  "Obiliq",
  "Shtime",
  "Shtërpce",
  "Graçanicë",
  "Lipjan",
  "Novo Bërdë",
  "Ranillug",
  "Partesh",
  "Kllokot",
  "Zubin Potok",
  "Zveçan",
  "Leposaviq",
  "Mitrovicë e Veriut",
  "Junik",
  "Mamushë",
];

export const CATEGORIES = [
  "Veshje",
  "Këpucë",
  "Aksesorë",
  "Elektronikë",
  "Shtëpi & Kuzhinë",
  "Bukuri & Shëndet",
  "Sport",
  "Lodra & Fëmijë",
  "Tjetër",
];

export const CONDITIONS = ["I ri", "Si i ri", "I përdorur"];

export const ORDER_STATUSES = [
  { value: "pending", label: "Në pritje" },
  { value: "new", label: "E re" },
  { value: "processing", label: "Në proces" },
  { value: "shipped", label: "Dërguar me postë" },
  { value: "completed", label: "E kryer" },
  { value: "cancelled", label: "E Anuluar" },
  { value: "rejected", label: "E kthyer" },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

export function statusLabel(value: string) {
  return ORDER_STATUSES.find((s) => s.value === value)?.label ?? value;
}

/** High-contrast visual badge classes per order status. */
export function statusBadgeClass(value: string) {
  switch (value) {
    case "pending":
    case "new":
      return "border-warning/40 bg-warning/20 text-warning-foreground";
    case "processing":
    case "shipped":
      return "border-primary/40 bg-primary/15 text-primary";
    case "completed":
      return "border-success/40 bg-success/20 text-success";
    case "cancelled":
    case "rejected":
      return "border-destructive/40 bg-destructive/15 text-destructive";
    default:
      return "border-border bg-secondary text-foreground";
  }
}

/** Quick-filter tab bar definition used above admin data tables. */
export const STATUS_QUICK_FILTERS: { key: string; label: string; statuses: string[] }[] = [
  { key: "all", label: "Të gjitha", statuses: [] },
  { key: "pending", label: "Në pritje", statuses: ["pending", "new"] },
  { key: "shipped", label: "Dërguar me postë", statuses: ["processing", "shipped"] },
  { key: "completed", label: "Të kryera", statuses: ["completed"] },
  { key: "returned", label: "Të kthyera", statuses: ["rejected", "cancelled"] },
];

export function formatPrice(value: number | string | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return `${n.toFixed(2)} €`;
}

/** Short, readable order id, e.g. #5471. Falls back to a UUID prefix. */
export function formatOrderNo(orderNo: number | null | undefined, fallbackId?: string) {
  if (orderNo != null && Number.isFinite(Number(orderNo))) return `#${orderNo}`;
  return fallbackId ? `#${fallbackId.slice(0, 6).toUpperCase()}` : "#—";
}

/** Normalize a free-text city into one of the standard Kosovo municipalities. */
const normCity = (s: string) =>
  s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export function matchKosovoCity(input: string | null | undefined): string | null {
  if (!input) return null;
  const n = normCity(input);
  if (!n) return null;
  const exact = KOSOVO_CITIES.find((c) => normCity(c) === n);
  if (exact) return exact;
  const partial = KOSOVO_CITIES.find(
    (c) => n.includes(normCity(c)) || normCity(c).includes(n),
  );
  return partial ?? null;
}
