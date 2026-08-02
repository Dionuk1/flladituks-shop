import { Link } from "@tanstack/react-router";
import { ShoppingCart, Sparkles } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnnouncementBar } from "@/components/store/announcement-bar";

export function StoreHeader({ onSearch }: { onSearch?: (q: string) => void }) {
  const { count, setOpen } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <AnnouncementBar />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Flladitu<span className="text-primary">KS</span>
          </span>
        </Link>

        {onSearch && (
          <input
            type="search"
            placeholder="Kërko produkte..."
            onChange={(e) => onSearch(e.target.value)}
            className="hidden flex-1 rounded-full border bg-secondary/60 px-4 py-2 text-sm outline-none ring-ring/40 focus:bg-card focus:ring-2 md:block"
          />
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="relative rounded-full"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Shporta</span>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
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
            placeholder="Kërko produkte..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-full border bg-secondary/60 px-4 py-2 text-sm outline-none focus:bg-card focus:ring-2 focus:ring-ring/40"
          />
        </div>
      )}
    </header>
  );
}
