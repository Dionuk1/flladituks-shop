import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_PASSWORD = () => process.env.ADMIN_PASSWORD || "flladitu2026";

function assertToken(token: unknown) {
  if (typeof token !== "string" || token.length === 0 || token !== ADMIN_PASSWORD()) {
    throw new Error("E paautorizuar");
  }
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) =>
    z.object({ password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) {
      throw new Error("Fjalëkalim i gabuar");
    }
    return { token: ADMIN_PASSWORD() };
  });

export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [products, orders] = await Promise.all([
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("orders").select("status, total"),
    ]);
    const ords = (orders.data ?? []) as Array<{ status: string; total: number }>;
    return {
      products: products.count ?? 0,
      orders: ords.length,
      newOrders: ords.filter((o) => o.status === "new").length,
      revenue: ords.reduce((s, o) => s + Number(o.total ?? 0), 0),
    };
  });

export const adminListOrders = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false });
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string; status: string }) =>
    z
      .object({
        token: z.string(),
        id: z.string().uuid(),
        status: z.string().min(1).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) =>
    z.object({ token: z.string(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const productSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  price: z.number().min(0).max(1_000_000),
  image_url: z.string().url().max(2000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  condition: z.string().max(50).optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  status: z.string().max(50).optional(),
});

export const adminInsertProducts = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { token: string; products: Array<z.infer<typeof productSchema>> }) =>
      z
        .object({
          token: z.string(),
          products: z.array(productSchema).min(1).max(2000),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").insert(data.products);
    if (error) throw new Error(error.message);
    return { inserted: data.products.length };
  });
