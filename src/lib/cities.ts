export const KOSOVO_CITIES = [
  "Prishtinë",
  "Prizren",
  "Pejë",
  "Gjakovë",
  "Mitrovicë",
  "Ferizaj",
  "Gjilan",
  "Vushtrri",
  "Suharekë",
  "Rahovec",
  "Drenas",
  "Lipjan",
  "Malishevë",
  "Kamenicë",
  "Podujevë",
  "Istog",
  "Klinë",
  "Skenderaj",
  "Deçan",
  "Viti",
  "Fushë Kosovë",
  "Obiliq",
  "Shtime",
  "Dragash",
  "Hani i Elezit",
  "Kaçanik",
  "Junik",
  "Mamushë",
  "Graçanicë",
  "Novobërdë",
  "Partesh",
  "Ranillug",
  "Kllokot",
  "Shtërpcë",
  "Zubin Potok",
  "Zveçan",
  "Leposaviq",
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
  { value: "new", label: "E re" },
  { value: "processing", label: "Në proces" },
  { value: "shipped", label: "E dërguar" },
  { value: "completed", label: "E përfunduar" },
  { value: "rejected", label: "Refuzuar" },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

export function statusLabel(value: string) {
  return ORDER_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function formatPrice(value: number | string | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return `${n.toFixed(2)} €`;
}
