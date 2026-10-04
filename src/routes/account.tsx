import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Gauge, Heart, LogOut, MapPin, Package, UserCog, ShoppingBag, Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CitySelect } from "@/components/ui/city-select";
import { StoreHeader } from "@/components/store/store-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { useWishlist } from "@/lib/wishlist";
import { useCart } from "@/lib/cart";
import { formatPrice, statusLabel, statusBadgeClass } from "@/lib/cities";
import { toast } from "sonner";

const TAB_KEYS = ["pult", "porosi", "adresa", "hollesi", "wishlist"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export const Route = createFileRoute("/account")({
  validateSearch: (s: Record<string, unknown>): { tab?: TabKey } => {
    const t = s.tab as TabKey | undefined;
    return t && TAB_KEYS.includes(t) ? { tab: t } : {};
  },
  head: () => ({
    meta: [
      { title: "Llogaria ime — FlladituKS" },
      { name: "description", content: "Menaxho porositë, adresat, hollësitë e llogarisë dhe listën e dëshirave në FlladituKS." },
      { property: "og:title", content: "Llogaria ime — FlladituKS" },
      { property: "og:description", content: "Pulti yt personal: porositë, adresat dhe wishlist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Llogaria ime — FlladituKS" },
      { name: "twitter:description", content: "Pulti yt personal: porositë, adresat dhe wishlist." },
    ],
  }),
  component: AccountPage,
});

const TABS: { key: TabKey; label: string; icon: typeof Gauge }[] = [
  { key: "pult", label: "Pult", icon: Gauge },
  { key: "porosi", label: "Porosi", icon: Package },
  { key: "adresa", label: "Adresa", icon: MapPin },
  { key: "hollesi", label: "Hollësi llogarie", icon: UserCog },
  { key: "wishlist", label: "Wishlist", icon: Heart },
];

type OrderRow = {
  id: string;
  order_no: number | null;
  created_at: string;
  items: Array<{ id: string; title: string; price: number; quantity: number }>;
  total: number;
  shipping_cost: number;
  discount_amount: number;
  status: string;
};
type Profile = { full_name: string; last_name: string; phone: string; city: string; address: string };
const EMPTY: Profile = { full_name: "", last_name: "", phone: "", city: "", address: "" };

const addrSchema = z.object({
  full_name: z.string().trim().min(2, "Shkruaj emrin").max(80),
  last_name: z.string().trim().min(2, "Shkruaj mbiemrin").max(80),
  phone: z.string().trim().min(6, "Numër i pavlefshëm").max(20).regex(/^[0-9 +\-()]+$/, "Numër i pavlefshëm"),
  city: z.string().min(1, "Zgjidh qytetin"),
  address: z.string().trim().min(4, "Shkruaj rrugën").max(255),
});

function AccountPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const tab: TabKey = search.tab ?? "pult";
  const setTab = (t: TabKey) => navigate({ to: "/account", search: { tab: t }, replace: true });
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profile, setProfile] = useState<Profile>(EMPTY);

  const loadData = useCallback(async (uid: string) => {
    const [o, p] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_no, created_at, items, total, shipping_cost, discount_amount, status")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name, last_name, phone, city, address").eq("id", uid).maybeSingle(),
    ]);
    if (o.error) toast.error("Porositë nuk u ngarkuan", { description: o.error.message });
    setOrders((o.data ?? []) as unknown as OrderRow[]);
    setProfile({ ...EMPTY, ...(p.data ?? {}) });
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      setEmail(u?.email ?? null);
      setUserId(u?.id ?? null);
      if (u) await loadData(u.id);
      setLoading(false);
    });
  }, [loadData]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("U çkyçe me sukses");
    navigate({ to: "/" });
  }

  async function saveProfile(patch: Partial<Profile>) {
    if (!userId) return false;
    const { error } = await supabase.from("profiles").upsert({ id: userId, ...profile, ...patch });
    if (error) {
      toast.error("Ruajtja dështoi", { description: error.message });
      return false;
    }
    setProfile((p) => ({ ...p, ...patch }));
    toast.success("U ruajt me sukses");
    return true;
  }

  const latest = orders[0];

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Llogaria ime</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Duke ngarkuar..." : email ? `I kyçur si ${email}` : "Nuk je i kyçur — hyr për të parë porositë e tua."}
        </p>

        {!loading && !email ? (
          <Button asChild className="mt-4 rounded-full">
            <Link to="/auth">Hyr ose Regjistrohu</Link>
          </Button>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
            <nav className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2 shadow-sm md:flex-col md:overflow-visible">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    tab === t.key ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
              <button type="button" onClick={signOut} className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10">
                <LogOut className="h-4 w-4" />
                Dilni
              </button>
            </nav>

            <section className="min-w-0 rounded-2xl border bg-card p-6 shadow-sm">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  {tab === "pult" && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold">
                        Mirë se erdhe{profile.full_name ? `, ${profile.full_name}` : ""}!
                      </h2>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Stat label="Email" value={email ?? "—"} />
                        <Stat label="Porosi gjithsej" value={String(orders.length)} />
                        <Stat
                          label="Porosia e fundit"
                          value={latest ? `#${latest.order_no ?? "—"} · ${statusLabel(latest.status)}` : "Asnjë"}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button onClick={() => setTab("porosi")} className="rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:shadow">
                          <Package className="h-5 w-5 text-primary" />
                          <p className="mt-2 font-semibold">Porositë e mia</p>
                          <p className="text-xs text-muted-foreground">Shiko historikun e porosive</p>
                        </button>
                        <Link to="/" hash="produktet" className="rounded-2xl border p-4 transition hover:border-primary/50 hover:shadow">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                          <p className="mt-2 font-semibold">Vazhdo blerjet</p>
                          <p className="text-xs text-muted-foreground">Shfleto produktet e reja</p>
                        </Link>
                      </div>
                    </div>
                  )}

                  {tab === "porosi" && <OrdersTab orders={orders} />}
                  {tab === "adresa" && <AddressTab profile={profile} onSave={saveProfile} />}
                  {tab === "hollesi" && <DetailsTab email={email} profile={profile} onSave={saveProfile} />}
                  {tab === "wishlist" && <WishlistTab />}
                </>
              )}
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
      <CartDrawer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-secondary/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function OrdersTab({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0)
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Porositë e mia</h2>
        <p className="text-sm text-muted-foreground">Ende nuk ke porosi të regjistruara në këtë llogari.</p>
      </div>
    );
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Porositë e mia</h2>
      {orders.map((o) => (
        <Link key={o.id} to="/porosia/$id" params={{ id: o.id }} className="block rounded-2xl border p-4 transition hover:border-primary/50 hover:shadow">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Porosia #{o.order_no ?? "—"}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(o.status)}`}>{statusLabel(o.status)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("sq-AL")}</p>
          <ul className="mt-2 space-y-0.5 text-sm">
            {(o.items ?? []).map((i, idx) => (
              <li key={idx} className="flex justify-between gap-2">
                <span className="truncate">{i.quantity}× {i.title}</span>
                <span>{formatPrice(Number(i.price) * Number(i.quantity))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">
              Transporti: {Number(o.shipping_cost) === 0 ? "Falas" : formatPrice(Number(o.shipping_cost))}
            </span>
            <span className="font-bold text-primary">{formatPrice(Number(o.total))}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function AddressTab({ profile, onSave }: { profile: Profile; onSave: (p: Partial<Profile>) => Promise<boolean> }) {
  const hasAddress = !!(profile.address && profile.city);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(profile), [profile]);
  const set = (k: keyof Profile, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = addrSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Gabim");
    setSaving(true);
    if (await onSave(parsed.data)) setEditing(false);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Adresa</h2>
        {!editing && (
          <Button size="sm" className="rounded-full" onClick={() => setEditing(true)}>
            {hasAddress ? <><Pencil className="mr-1 h-4 w-4" /> Ndrysho</> : <><Plus className="mr-1 h-4 w-4" /> Shto adresë</>}
          </Button>
        )}
      </div>
      {editing ? (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div><Label>Emri</Label><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
          <div><Label>Mbiemri</Label><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
          <div><Label>Qyteti</Label><CitySelect value={form.city} onChange={(v) => set("city", v)} /></div>
          <div><Label>Telefoni</Label><Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Rruga</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Rruga, numri, lagja..." /></div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving} className="rounded-full">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ruaj adresën</Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => { setForm(profile); setEditing(false); }}>Anulo</Button>
          </div>
        </form>
      ) : hasAddress ? (
        <div className="rounded-2xl border p-4 text-sm">
          <p className="font-semibold">{profile.full_name} {profile.last_name}</p>
          <p>{profile.address}</p>
          <p>{profile.city}</p>
          <p className="text-muted-foreground">{profile.phone}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nuk ke ruajtur ende asnjë adresë dorëzimi.</p>
      )}
    </div>
  );
}

function DetailsTab({ email, profile, onSave }: { email: string | null; profile: Profile; onSave: (p: Partial<Profile>) => Promise<boolean> }) {
  const [first, setFirst] = useState(profile.full_name);
  const [last, setLast] = useState(profile.last_name);
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="max-w-md space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (first.trim().length < 2) return toast.error("Shkruaj emrin");
        setSaving(true);
        await onSave({ full_name: first.trim(), last_name: last.trim() });
        setSaving(false);
      }}
    >
      <h2 className="text-lg font-bold">Hollësi llogarie</h2>
      <div><Label>Email</Label><Input value={email ?? ""} disabled /></div>
      <div><Label>Emri</Label><Input value={first} onChange={(e) => setFirst(e.target.value)} maxLength={80} /></div>
      <div><Label>Mbiemri</Label><Input value={last} onChange={(e) => setLast(e.target.value)} maxLength={80} /></div>
      <Button type="submit" disabled={saving} className="rounded-full">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ruaj ndryshimet</Button>
    </form>
  );
}

type WishProduct = { id: string; title: string; price: number; image_url: string | null; images: string[] | null; stock: number; status: string };

function WishlistTab() {
  const { ids, toggle } = useWishlist();
  const { add } = useCart() as unknown as { add: (p: unknown) => void };
  const [products, setProducts] = useState<WishProduct[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    supabase
      .from("products")
      .select("id, title, price, image_url, images, stock, status")
      .in("id", ids)
      .then(({ data }) => {
        setProducts((data ?? []) as WishProduct[]);
        setLoading(false);
      });
  }, [ids]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Wishlist</h2>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Lista jote e dëshirave është bosh. Shtyp ♥ te një produkt për ta ruajtur.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => {
            const img = p.images?.[0] ?? p.image_url;
            const available = p.stock > 0 && p.status === "available";
            return (
              <div key={p.id} className="flex gap-3 rounded-2xl border p-3">
                {img ? <img src={img} alt={p.title} className="h-20 w-20 rounded-xl object-cover" /> : <div className="h-20 w-20 rounded-xl bg-secondary" />}
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-semibold">{p.title}</p>
                  <p className="text-sm font-bold text-primary">{formatPrice(Number(p.price))}</p>
                  <div className="mt-auto flex gap-2">
                    {available && typeof add === "function" && (
                      <Button size="sm" className="rounded-full" onClick={() => { add({ id: p.id, title: p.title, price: Number(p.price), image_url: img, stock: p.stock }); toast.success("U shtua në shportë"); }}>
                        Në shportë
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => void toggle(p.id)} aria-label="Hiq">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
