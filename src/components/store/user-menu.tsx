import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { Heart, LogOut, Package, User as UserIcon, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function initialsOf(first?: string | null, last?: string | null) {
  const a = (first ?? "").trim();
  const b = (last ?? "").trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  const parts = (a || b).split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return "";
}

export function UserMenu({ user }: { user: User }) {
  const { lang } = useI18n();
  const en = lang === "en";
  const navigate = useNavigate();
  const [name, setName] = useState({ first: "", last: "" });

  useEffect(() => {
    let off = false;
    supabase
      .from("profiles")
      .select("full_name, last_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!off && data) setName({ first: data.full_name ?? "", last: data.last_name ?? "" });
      });
    return () => {
      off = true;
    };
  }, [user.id]);

  const initials = initialsOf(name.first, name.last);
  const display = [name.first, name.last].filter(Boolean).join(" ").trim();

  const go = (tab: "hollesi" | "porosi" | "wishlist") =>
    navigate({ to: "/account", search: { tab } });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("U çkyçe me sukses");
    navigate({ to: "/" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={en ? "Account menu" : "Menuja e llogarisë"}
        className="flex max-w-[11rem] items-center gap-2 rounded-full p-0.5 outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:pr-3"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full gradient-brand text-xs font-bold text-primary-foreground">
          {initials || <UserRound className="h-4 w-4" />}
        </span>
        {display && <span className="hidden truncate text-sm font-medium md:inline">{display}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={8} className="w-64 max-w-[calc(100vw-1rem)] rounded-2xl p-1.5">
        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full gradient-brand text-sm font-bold text-primary-foreground">
            {initials || <UserRound className="h-5 w-5" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{display || (en ? "My account" : "Llogaria ime")}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => go("hollesi")} className="gap-2 rounded-lg py-2">
          <UserIcon className="h-4 w-4 text-primary" /> {en ? "Profile Details" : "Të dhënat e profilit"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("porosi")} className="gap-2 rounded-lg py-2">
          <Package className="h-4 w-4 text-primary" /> {en ? "Orders" : "Porositë"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("wishlist")} className="gap-2 rounded-lg py-2">
          <Heart className="h-4 w-4 text-primary" /> {en ? "Wishlist" : "Të preferuarat"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()} className="gap-2 rounded-lg py-2 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> {en ? "Sign out" : "Shkyçu"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
