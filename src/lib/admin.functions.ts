import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_PASSWORD = () => process.env.ADMIN_PASSWORD || "flladituneser69";

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
  .inputValidator((d: { token: string; id: string; status: string; reason?: string }) =>
    z
      .object({
        token: z.string(),
        id: z.string().uuid(),
        status: z.string().min(1).max(50),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("items, status, notes")
      .eq("id", data.id)
      .maybeSingle();
    const prevStatus = order?.status;
    const items = ((order?.items ?? []) as Array<{ id: string; quantity: number }>);
    const ids = Array.from(new Set(items.map((i) => i.id).filter(Boolean)));

    // Completing the order: decrement stock, mark sold when depleted
    if (data.status === "completed" && prevStatus !== "completed" && ids.length) {
      const { data: prods } = await supabaseAdmin
        .from("products").select("id, stock").in("id", ids);
      const byId: Record<string, number> = {};
      for (const p of prods ?? []) byId[(p as any).id] = Number((p as any).stock ?? 0);
      for (const it of items) {
        const current = byId[it.id] ?? 0;
        const next = Math.max(0, current - Number(it.quantity ?? 1));
        const update: any = { stock: next };
        if (next === 0) update.status = "sold";
        await supabaseAdmin.from("products").update(update).eq("id", it.id);
      }
    }

    // Rejecting the order: if previously decremented stock (i.e. completed), restore it
    // and re-mark sold products as available.
    if (data.status === "rejected" && prevStatus !== "rejected" && ids.length) {
      const wasCompleted = prevStatus === "completed";
      const { data: prods } = await supabaseAdmin
        .from("products").select("id, stock, status").in("id", ids);
      const byId: Record<string, { stock: number; status: string }> = {};
      for (const p of prods ?? [])
        byId[(p as any).id] = { stock: Number((p as any).stock ?? 0), status: (p as any).status };
      for (const it of items) {
        const cur = byId[it.id];
        if (!cur) continue;
        const qty = Number(it.quantity ?? 1);
        const update: any = {};
        if (wasCompleted) update.stock = cur.stock + qty;
        if (cur.status === "sold") update.status = "available";
        if (Object.keys(update).length)
          await supabaseAdmin.from("products").update(update).eq("id", it.id);
      }
    }

    const patch: any = { status: data.status };
    if (data.reason && data.reason.trim()) {
      const prevNotes = (order?.notes ?? "").toString();
      const tag = `[Refuzuar: ${data.reason.trim()}]`;
      patch.notes = prevNotes ? `${prevNotes}\n${tag}` : tag;
    }

    const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", data.id);
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
  old_price: z.number().min(0).max(1_000_000).nullable().optional(),
  image_url: z.string().url().max(2000).nullable().optional(),
  images: z.array(z.string().url().max(2000)).max(3).optional(),
  category: z.string().max(100).nullable().optional(),
  condition: z.string().max(50).optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  status: z.string().max(50).optional(),
  shipping_cost: z.number().min(0).max(10_000).optional(),
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

export const adminListProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpdateProductStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string; status: "available" | "sold" }) =>
    z
      .object({
        token: z.string(),
        id: z.string().uuid(),
        status: z.enum(["available", "sold"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("products")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) =>
    z.object({ token: z.string(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateProduct = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { token: string; id: string; product: z.infer<typeof productSchema> }) =>
      z
        .object({
          token: z.string(),
          id: z.string().uuid(),
          product: productSchema,
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Read current price to handle automatic discount: if new price < current, push current -> old_price
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("price, old_price")
      .eq("id", data.id)
      .maybeSingle();

    const patch: any = { ...data.product };
    if (existing) {
      const currentPrice = Number((existing as any).price ?? 0);
      const newPrice = Number(data.product.price);
      if (Number.isFinite(newPrice) && newPrice < currentPrice) {
        patch.old_price = currentPrice;
      } else if (data.product.old_price === null) {
        patch.old_price = null;
      }
    }
    // Normalize images: dedupe + drop empties + cap 3
    if (Array.isArray(patch.images)) {
      patch.images = Array.from(new Set(patch.images.filter((u: string) => u && u.trim()))).slice(0, 3);
      if (!patch.image_url && patch.images[0]) patch.image_url = patch.images[0];
    }

    const { error } = await supabaseAdmin.from("products").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================== Settings (shipping price) ===================

const SHIPPING_KEY = "shipping_price";
const DEFAULT_SHIPPING = 2.0;

async function readShippingPriceServer(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", SHIPPING_KEY)
    .maybeSingle();
  const v = Number(data?.value ?? DEFAULT_SHIPPING);
  return Number.isFinite(v) && v >= 0 ? v : DEFAULT_SHIPPING;
}

export const getShippingPrice = createServerFn({ method: "GET" }).handler(async () => {
  return { price: await readShippingPriceServer() };
});

export const adminSetShippingPrice = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; price: number }) =>
    z.object({ token: z.string(), price: z.number().min(0).max(1000) }).parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rounded = Math.round(data.price * 100) / 100;
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: SHIPPING_KEY, value: rounded, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { price: rounded };
  });

// =================== Financials ===================

export const adminFinancials = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const shipping = await readShippingPriceServer();

    const CONFIRMED = ["processing", "shipped", "completed"];
    const { data: rows } = await supabaseAdmin
      .from("orders")
      .select("total, status, shipping_cost, items")
      .in("status", CONFIRMED);
    const orders = (rows ?? []) as Array<{
      total: number;
      status: string;
      shipping_cost: number | null;
      items: Array<{ id: string; quantity: number }>;
    }>;

    // Gather product ids referenced in confirmed orders to read per-product shipping costs
    const ids = Array.from(
      new Set(orders.flatMap((o) => (o.items ?? []).map((i) => i.id).filter(Boolean))),
    );
    let productShipping: Record<string, number> = {};
    if (ids.length) {
      const { data: prods } = await supabaseAdmin
        .from("products")
        .select("id, shipping_cost")
        .in("id", ids);
      for (const p of prods ?? []) {
        const v = Number((p as any).shipping_cost ?? 0);
        if (v > 0) productShipping[(p as any).id] = v;
      }
    }

    const gross = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const shippingCosts = orders.reduce((s, o) => {
      const itemBased = (o.items ?? []).reduce(
        (a, it) => a + (productShipping[it.id] ?? 0) * Number(it.quantity ?? 1),
        0,
      );
      if (itemBased > 0) return s + itemBased;
      return s + Number(o.shipping_cost ?? shipping);
    }, 0);

    return {
      orders: orders.length,
      shippingPrice: shipping,
      gross,
      shippingCosts,
      net: gross - shippingCosts,
    };
  });

// =================== Public order operations ===================

const orderItemSchema = z.object({
  id: z.string(),
  title: z.string().max(255),
  price: z.number().min(0).max(1_000_000),
  quantity: z.number().int().min(1).max(1000),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      customer_name: string;
      phone: string;
      city: string;
      address: string;
      notes?: string | null;
      items: Array<z.infer<typeof orderItemSchema>>;
    }) =>
      z
        .object({
          customer_name: z.string().trim().min(2).max(120),
          phone: z
            .string()
            .trim()
            .min(6)
            .max(20)
            .regex(/^[0-9 +\-()]+$/),
          city: z.string().min(1).max(80),
          address: z.string().trim().min(4).max(255),
          notes: z.string().max(500).nullable().optional(),
          items: z.array(orderItemSchema).min(1).max(100),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const itemsTotal = data.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const shippingPrice = await readShippingPriceServer();
    const shippingCost = itemsTotal > 20 ? 0 : shippingPrice;
    const total = itemsTotal + shippingCost;

    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        phone: data.phone,
        city: data.city,
        address: data.address,
        notes: data.notes || null,
        items: data.items,
        total,
        shipping_cost: shippingCost,
        payment_method: "cash_on_delivery",
        status: "new",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Gabim te porosia");
    return { id: row.id };
  });

export const getOrderById = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, customer_name, phone, city, address, items, total, shipping_cost, status, notes, created_at, payment_method",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Porosia nuk u gjet");
    return row;
  });

// =================== Image upload ===================

export const adminUploadProductImage = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; filename: string; contentType: string; dataBase64: string }) =>
    z
      .object({
        token: z.string(),
        filename: z.string().min(1).max(255),
        contentType: z
          .string()
          .regex(/^image\/(png|jpe?g|webp|gif|avif)$/i, "Lloji i skedarit i palejuar"),
        dataBase64: z.string().min(1).max(15_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buf = Buffer.from(data.dataBase64, "base64");
    if (buf.length > 5 * 1024 * 1024) throw new Error("Foto më e madhe se 5MB");
    const ext = data.filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `products/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("product-images")
      .upload(path, buf, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
    return { url: pub.publicUrl };
  });
