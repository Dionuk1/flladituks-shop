import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Gauge,
  Heart,
  LogOut,
  MapPin,
  Package,
  UserCog,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StoreHeader } from "@/components/store/store-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Llogaria ime — FlladituKS" },
      {
        name: "description",
        content:
          "Menaxho porositë, adresat, hollësitë e llogarisë dhe listën e dëshirave në FlladituKS.",
      },
      { property: "og:title", content: "Llogaria ime — FlladituKS" },
      {
        property: "og:description",
        content: "Pulti yt personal: porositë, adresat dhe wishlist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Llogaria ime — FlladituKS" },
      {
        name: "twitter:description",
        content: "Pulti yt personal: porositë, adresat dhe wishlist.",
      },
    ],
  }),
  component: AccountPage,
});

type TabKey = "pult" | "porosi" | "adresa" | "hollesi" | "wishlist";

const TABS: { key: TabKey; label: string; icon: typeof Gauge }[] = [
  { key: "pult", label: "Pult", icon: Gauge },
  { key: "porosi", label: "Porosi", icon: Package },
  { key: "adresa", label: "Adresa", icon: MapPin },
  { key: "hollesi", label: "Hollësi llogarie", icon: UserCog },
  { key: "wishlist", label: "Wishlist", icon: Heart },
];

function AccountPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("pult");
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setEmail(null);
    toast.success("U çkyçe me sukses");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <StoreHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Llogaria ime</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? "Duke ngarkuar..."
            : email
              ? `I kyçur si ${email}`
              : "Nuk je i kyçur — hyr për të parë porositë e tua."}
        </p>

        {!loading && !email && (
          <Button asChild className="mt-4 rounded-full">
            <Link to="/auth">Hyr ose Regjistrohu</Link>
          </Button>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2 shadow-sm md:flex-col md:overflow-visible">
            {TABS.map((tItem) => (
              <button
                key={tItem.key}
                type="button"
                onClick={() => setTab(tItem.key)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  tab === tItem.key
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <tItem.icon className="h-4 w-4" />
                {tItem.label}
              </button>
            ))}
            <button
              type="button"
              onClick={signOut}
              className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Dilni
            </button>
          </nav>

          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            {tab === "pult" && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold">Pult</h2>
                <p className="text-sm text-muted-foreground">
                  Mirë se erdhe! Nga këtu mund të shikosh porositë e fundit, të përditësosh
                  adresat e dorëzimit dhe hollësitë e llogarisë.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => setTab("porosi")}
                    className="rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:shadow"
                  >
                    <Package className="h-5 w-5 text-primary" />
                    <p className="mt-2 font-semibold">Porositë e mia</p>
                    <p className="text-xs text-muted-foreground">Shiko historikun e porosive</p>
                  </button>
                  <Link
                    to="/"
                    hash="produktet"
                    className="rounded-2xl border p-4 transition hover:border-primary/50 hover:shadow"
                  >
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    <p className="mt-2 font-semibold">Vazhdo blerjet</p>
                    <p className="text-xs text-muted-foreground">Shfleto produktet e reja</p>
                  </Link>
                </div>
              </div>
            )}

            {tab === "porosi" && (
              <div className="space-y-2">
                <h2 className="text-lg font-bold">Porositë e mia</h2>
                <p className="text-sm text-muted-foreground">
                  Ende nuk ke porosi të regjistruara në këtë llogari.
                </p>
              </div>
            )}

            {tab === "adresa" && (
              <div className="space-y-2">
                <h2 className="text-lg font-bold">Adresa</h2>
                <p className="text-sm text-muted-foreground">
                  Nuk ke ruajtur ende asnjë adresë dorëzimi.
                </p>
              </div>
            )}

            {tab === "hollesi" && (
              <div className="space-y-2">
                <h2 className="text-lg font-bold">Hollësi llogarie</h2>
                <p className="text-sm text-muted-foreground">
                  Email: <span className="font-medium text-foreground">{email ?? "—"}</span>
                </p>
              </div>
            )}

            {tab === "wishlist" && (
              <div className="space-y-2">
                <h2 className="text-lg font-bold">Wishlist</h2>
                <p className="text-sm text-muted-foreground">
                  Lista jote e dëshirave është bosh.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
      <CartDrawer />
    </div>
  );
}
