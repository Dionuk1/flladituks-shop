import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Sparkles } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { useI18n } from "@/lib/i18n";

export function StoreHeader({ onSearch }: { onSearch?: (q: string) => void }) {
  const { count, setOpen } = useCart();
  const { t } = useI18n();
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
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-primary-foreground shadow-sm transition-transform duration-300 hover:scale-110">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Flladitu<span className="text-primary">KS</span>
          </span>
        </Link>

        {onSearch && (
          <input
            type="search"
            placeholder={t("nav.search")}
            onChange={(e) => onSearch(e.target.value)}
            className="hidden flex-1 rounded-full border bg-secondary/60 px-4 py-2 text-sm outline-none ring-ring/40 transition focus:bg-card focus:ring-2 md:block"
          />
        )}

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:text-primary"
          >
            <Link to="/auth">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Llogaria</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="relative rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:text-primary"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">{t("nav.cart")}</span>
            {count > 0 && (
              <span
                className={`absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ${
                  bounce ? "animate-cart-bounce" : ""
                }`}
              >
                {count}
              </span>
            )}
          </Button>
        </div>
      </div>
      {onSearch && (
        <div className="px-4 pb-3 md:hidden">
          <input
            type="search"
            placeholder={t("nav.search")}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-full border bg-secondary/60 px-4 py-2 text-sm outline-none focus:bg-card focus:ring-2 focus:ring-ring/40"
          />
        </div>
      )}
    </header>
  );
}
