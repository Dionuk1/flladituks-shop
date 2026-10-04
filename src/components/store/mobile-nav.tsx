import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuthUser } from "@/lib/notifications";

export function MobileNav() {
  const { count, open, setOpen } = useCart();
  const user = useAuthUser();
  const { pathname, hash } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, hash: s.location.hash }),
  });

  if (pathname.startsWith("/admin")) return null;

  const base =
    "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors";
  const onCats = pathname === "/" && hash === "produktet";
  const onAccount = pathname.startsWith("/account") || pathname.startsWith("/auth");
  const cls = (active: boolean) => `${base} ${active ? "text-primary" : "text-muted-foreground"}`;

  return (
    <>
      <div aria-hidden className="h-16 md:hidden" />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-stretch">
          <Link to="/" className={cls(pathname === "/" && !onCats && !open)}>
            <Home className="h-5 w-5" />
            Ballina
          </Link>
          <Link to="/" hash="produktet" className={cls(onCats && !open)}>
            <LayoutGrid className="h-5 w-5" />
            Kategoritë
          </Link>
          <button type="button" onClick={() => setOpen(true)} className={`${cls(open)} relative`}>
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
          <Link to={user ? "/account" : "/auth"} className={cls(onAccount && !open)}>
            <User className="h-5 w-5" />
            Llogaria
          </Link>
        </div>
      </nav>
    </>
  );
}
