import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/lib/cart";

export function MobileNav() {
  const { count, setOpen } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname.startsWith("/admin")) return null;

  const base =
    "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-stretch">
        <Link
          to="/"
          className={`${base} ${pathname === "/" ? "text-primary" : "text-muted-foreground"}`}
        >
          <Home className="h-5 w-5" />
          Ballina
        </Link>
        <Link
          to="/"
          hash="produktet"
          className={`${base} text-muted-foreground`}
        >
          <LayoutGrid className="h-5 w-5" />
          Kategoritë
        </Link>
        <button type="button" onClick={() => setOpen(true)} className={`${base} relative text-muted-foreground`}>
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </span>
          Shporta
        </button>
        <Link
          to="/account"
          className={`${base} ${pathname.startsWith("/account") ? "text-primary" : "text-muted-foreground"}`}
        >
          <User className="h-5 w-5" />
          Llogaria
        </Link>
      </div>
    </nav>
  );
}
