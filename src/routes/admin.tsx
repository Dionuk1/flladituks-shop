import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, PlusCircle, FileSpreadsheet, ClipboardList, LogOut, Store, Lock } from "lucide-react";
import { isAdmin, loginAdmin, logoutAdmin } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Përmbledhje", icon: Package, exact: true },
  { to: "/admin/shto", label: "Shto Produkt", icon: PlusCircle },
  { to: "/admin/importo", label: "Importo Excel", icon: FileSpreadsheet },
  { to: "/admin/porosite", label: "Porositë", icon: ClipboardList },
];

function AdminLayout() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    setAuthed(isAdmin());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg">
          <div className="mb-5 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl gradient-brand text-white">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-xl font-bold">Hyrja e Administratorit</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Shkruani fjalëkalimin për të vazhduar.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (loginAdmin(password)) {
                setAuthed(true);
                toast.success("Mirë se erdhët!");
              } else {
                toast.error("Fjalëkalim i gabuar");
              }
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="pw">Fjalëkalimi</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full rounded-full">
              Hyr në Panel
            </Button>
            <Link
              to="/"
              className="block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              ← Kthehu te dyqani
            </Link>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-secondary/40">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="border-b px-5 py-5">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold leading-none">FlladituKS</p>
              <p className="mt-1 text-xs text-muted-foreground">Paneli i Adminit</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent"
          >
            <Store className="h-4 w-4" /> Shiko dyqanin
          </Link>
          <button
            onClick={() => {
              logoutAdmin();
              setAuthed(false);
              navigate({ to: "/admin" });
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Dil
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <Link to="/admin" className="font-bold">
            FlladituKS Admin
          </Link>
          <button
            onClick={() => {
              logoutAdmin();
              setAuthed(false);
            }}
            className="text-sm text-destructive"
          >
            Dil
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-2 md:hidden">
          {navItems.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                  active ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
