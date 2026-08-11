import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, ShieldCheck, Banknote, Search, SlidersHorizontal, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/store/store-header";
import { CartDrawer } from "@/components/store/cart-drawer";
import { ProductCard, discountPercent, type Product } from "@/components/store/product-card";
import { CATEGORIES } from "@/lib/cities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SiteFooter } from "@/components/store/site-footer";
import { useI18n } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlladituKS — Dyqani Online në Kosovë" },
      {
        name: "description",
        content:
          "Bli online produktet e fundit në FlladituKS me dërgesë në të gjithë Kosovën. Pagesa në dorë.",
      },
      { property: "og:title", content: "FlladituKS — Dyqani Online" },
      {
        property: "og:description",
        content: "Dyqani modern online me dorëzim në të gjithë Kosovën.",
      },
    ],
  }),
  component: Storefront,
});

function Storefront() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [hideSold, setHideSold] = useState(true);
  const [onlyDeals, setOnlyDeals] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (hideSold && p.status === "sold") return false;
      if (onlyDeals && !discountPercent(p.price, p.old_price)) return false;
      if (q && !`${p.title} ${p.description ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      if (category !== "all" && p.category !== category) return false;
      if (maxPrice && Number(p.price) > Number(maxPrice)) return false;
      return true;
    });
  }, [products, q, category, maxPrice, hideSold, onlyDeals]);

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader onSearch={setQ} />

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 gradient-brand opacity-95" />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="breeze-wave absolute -left-10 top-10 h-40 w-[130%] rounded-[100%] bg-white/10 blur-3xl" />
          <div className="breeze-wave absolute -left-10 bottom-0 h-32 w-[130%] rounded-[100%] bg-white/10 blur-2xl" style={{ animationDelay: "-6s" }} />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-12 text-white sm:px-6 sm:py-20">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-3 max-w-xl text-white/90">
            {t("hero.sub")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
              <Truck className="h-4 w-4" /> {t("hero.fast")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
              <Banknote className="h-4 w-4" /> {t("hero.cod")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
              <ShieldCheck className="h-4 w-4" /> {t("hero.quality")}
            </span>
          </div>
        </div>
      </section>

      <section id="produktet" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyDeals((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              onlyDeals
                ? "border-destructive bg-destructive text-destructive-foreground"
                : "bg-card hover:bg-secondary"
            }`}
          >
            <Flame className="h-4 w-4" /> {t("filters.deals")}
          </button>
          <div className="ml-auto flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-sm">
            <Switch id="hide-sold" checked={hideSold} onCheckedChange={setHideSold} />
            <Label htmlFor="hide-sold" className="cursor-pointer text-sm">
              {t("filters.hideSold")}
            </Label>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary/60 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("filters.search")}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder={t("filters.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={t("filters.maxPrice")}
              className="w-[130px]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">{t("empty.title")}</p>
            <p className="mt-1 text-sm">
              {t("empty.sub")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />

      <CartDrawer />
    </div>
  );
}
