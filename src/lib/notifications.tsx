import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Current signed-in user (null for guests). Client-only. */
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return user;
}

export type BuyerNotification = {
  id: string;
  order_id: string | null;
  order_no: number | null;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export function useBuyerNotifications() {
  const user = useAuthUser();
  const [items, setItems] = useState<BuyerNotification[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("id, order_id, order_no, title, body, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as BuyerNotification[]);
  }, [user]);

  useEffect(() => {
    void load();
    if (!user) return;
    const id = setInterval(load, 30000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, user]);

  const markRead = useCallback(async (id: string) => {
    setItems((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setItems((p) => p.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }, [user]);

  return {
    user,
    items,
    unread: items.filter((n) => !n.is_read).length,
    reload: load,
    markRead,
    markAllRead,
  };
}
