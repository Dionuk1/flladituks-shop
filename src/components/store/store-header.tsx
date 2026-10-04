import { Link, useNavigate } from "@tanstack/react-router";
import { useBuyerNotifications } from "@/lib/notifications";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Heart,
  Home,
  LayoutGrid,
  LogIn,
  Menu,
  Search,
  ShoppingCart,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { useI18n, type Lang } from "@/lib/i18n";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NAV = [
  { to: "/", label: "Ballina", icon: Home },
  { to: "/", label: "Oferta Javore", icon: Tag, hash: "produktet" },
  { to: "/", label: "Kategoritë", icon: LayoutGrid, hash: "produktet" },
  { to: "/account", label: "Wishlist", icon: Heart, search: { tab: "wishlist" } },
] as const;

export function StoreHeader({ onSearch }: { onSearch?: (q: string) => void }) {
  const { count, setOpen } = useCart();
  const { t, lang, setLang } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const notif = useBuyerNotifications();
  const navigate = useNavigate();
  const [bounce, setBounce] = useState(false);
  const prev = useRef(count);

  useEffect(() => {
    if (count > prev.current) {
      setBounce(true);
      const id = setTimeout(() => setBounce(false), 550);
      prev.current = count;
      return () => clearTimeout(id);
    }
    prev.current = count;
  }, [count]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <AnnouncementBar />
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menu"
          onClick={() => setMenuOpen(true)}
          className="rounded-full"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link to="/" className="mx-auto flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl gradient-brand text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="truncate text-base font-extrabold tracking-tight sm:text-lg">
            Flladitu<span className="text-primary">KS</span>
          </span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {onSearch && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("nav.search")}
              onClick={() => setSearchOpen((v) => !v)}
              className="rounded-full"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          <Popover open={bellOpen} onOpenChange={(v) => { setBellOpen(v); if (v) void notif.reload(); }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Njoftimet" className="relative rounded-full">
                <Bell className="h-5 w-5" />
                {notif.unread > 0 && (
                  <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {notif.unread}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 rounded-2xl p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm font-semibold">Njoftimet</p>
                {notif.unread > 0 && (
                  <button type="button" onClick={() => void notif.markAllRead()} className="text-xs font-medium text-primary hover:underline">
                    Shëno të gjitha si të lexuara
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {!notif.user ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    <Link to="/auth" className="font-medium text-primary" onClick={() => setBellOpen(false)}>Hyr</Link> për të parë njoftimet e porosive.
                  </p>
                ) : notif.items.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Nuk ke njoftime për momentin.</p>
                ) : (
                  notif.items.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        void notif.markRead(n.id);
                        setBellOpen(false);
                        if (n.order_id) navigate({ to: "/porosia/$id", params: { id: n.order_id } });
                      }}
                      className={`flex w-full gap-2 border-b px-4 py-3 text-left transition last:border-0 hover:bg-secondary ${n.is_read ? "" : "bg-primary/5"}`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-primary"}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{n.title}</span>
                        <span className="block text-xs text-muted-foreground">{n.body}</span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleString("sq-AL")}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <ThemeToggle className="border-0 bg-transparent shadow-none hover:bg-accent" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label={t("nav.cart")}
            className="relative rounded-full"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span
                className={`absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ${
                  bounce ? "animate-cart-bounce" : ""
                }`}
              >
                {count}
              </span>
            )}
          </Button>
        </div>
      </div>

      {onSearch && searchOpen && (
        <div className="border-t px-3 py-2 sm:px-6">
          <input
            autoFocus
            type="search"
            placeholder={t("nav.search")}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-full border bg-secondary/60 px-4 py-2 text-sm outline-none focus:bg-card focus:ring-2 focus:ring-ring/40"
          />
        </div>
      )}

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[86%] max-w-sm p-0 sm:w-80">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl gradient-brand text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              Flladitu<span className="-ml-2 text-primary">KS</span>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 p-4">
            {onSearch && (
              <div className="flex items-center gap-2 rounded-full border bg-secondary/60 px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder={t("nav.search")}
                  onChange={(e) => onSearch(e.target.value)}
                  className="w-full bg-transparent py-2 text-sm outline-none"
                />
              </div>
            )}

            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  hash={"hash" in item ? item.hash : undefined}
                  search={("search" in item ? item.search : undefined) as never}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-secondary"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase text-muted-foreground">Gjuha</p>
              <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sq">🇦🇱 Shqip (SQ)</SelectItem>
                  <SelectItem value="en">🇬🇧 English (EN)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button asChild className="w-full rounded-full" onClick={() => setMenuOpen(false)}>
              {notif.user ? (
                <Link to="/account">
                  <User className="mr-2 h-4 w-4" /> Llogaria
                </Link>
              ) : (
                <Link to="/auth">
                  <LogIn className="mr-2 h-4 w-4" /> Llogaria · Hyr / Regjistrohu
                </Link>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
