import { createServerFn } from "@tanstack/react-start";

interface CreateOrderInput {
  customer_id?: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  address_line?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  message?: string | null;
  total: number;
  payment_provider: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    name: string;
    variantLabel?: string | null;
    qty: number;
    price: number;
  }>;
}

export const createShopOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: CreateOrderInput) => {
    if (!data?.guest_name || !data?.guest_email) throw new Error("Nome e e-mail são obrigatórios");
    if (!data?.items || data.items.length === 0) throw new Error("Carrinho vazio");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("shop_orders")
      .insert({
        customer_id: data.customer_id || null,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone || null,
        address_line: data.address_line || null,
        address_city: data.address_city || null,
        address_state: data.address_state || null,
        address_zip: data.address_zip || null,
        message: data.message || null,
        total: data.total,
        status: "pending",
        payment_provider: data.payment_provider,
      })
      .select()
      .single();

    if (error || !order) {
      console.error("Erro ao criar pedido no servidor:", error);
      throw new Error(error?.message || "Falha ao criar o pedido.");
    }

    const orderItems = data.items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      variant_id: i.variantId || null,
      product_name: i.variantLabel ? `${i.name} — ${i.variantLabel}` : i.name,
      variant_label: i.variantLabel || null,
      qty: i.qty,
      unit_price: i.price,
    }));

    const { error: itemErr } = await supabaseAdmin.from("shop_order_items").insert(orderItems);
    if (itemErr) {
      console.error("Erro ao salvar itens do pedido:", itemErr);
      throw new Error(itemErr.message);
    }

    return order;
  });

interface CheckoutInput {
  order_id: string;
  success_url?: string;
  cancel_url?: string;
}

export const createInfinitepayCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: CheckoutInput) => {
    if (!data?.order_id) throw new Error("order_id obrigatório");
    return data;
  })
  .handler(async ({ data }) => {
    const handle = process.env.INFINITEPAY_HANDLE || "rayanne-emanuelly";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("shop_orders")
      .select("id, total, guest_name, guest_email, guest_phone, address_line, address_city, address_state, address_zip, items:shop_order_items(product_name, qty, unit_price)")
      .eq("id", data.order_id)
      .single();
    if (error || !order) throw new Error("Pedido não encontrado");

    // Formatar itens para a API em centavos (ex: R$ 10.00 = 1000 centavos)
    const itemsFormatted = (order.items || []).map((i: any) => ({
      description: i.product_name || "Produto Privê",
      quantity: Number(i.qty) || 1,
      price: Math.round(Number(i.unit_price) * 100),
    }));

    const finalItems = itemsFormatted.length > 0 ? itemsFormatted : [{
      description: `Pedido Privê ${order.id.slice(0, 8).toUpperCase()}`,
      quantity: 1,
      price: Math.round(Number(order.total) * 100),
    }];

    const payload: Record<string, any> = {
      handle,
      order_nsu: order.id,
      items: finalItems,
    };

    if (data.success_url) {
      payload.redirect_url = data.success_url;
    }

    if (order.guest_name || order.guest_email || order.guest_phone) {
      payload.customer = {
        name: order.guest_name || "Cliente",
        email: order.guest_email || "contato@priveloja.com.br",
        phone_number: order.guest_phone ? order.guest_phone.replace(/\D/g, "") : "",
      };
    }

    if (order.address_line || order.address_zip) {
      payload.address = {
        cep: order.address_zip ? order.address_zip.replace(/\D/g, "") : "",
        street: order.address_line || "",
        neighborhood: order.address_city || "",
        number: "S/N",
      };
    }

    // Requisição para a API oficial do InfinitePay Links
    const res = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Erro na API da InfinitePay:", body);
      throw new Error(`InfinitePay [${res.status}]: ${body}`);
    }

    const json = await res.json();
    const checkoutUrl = json.url || json.checkout_url || json.link || (json.slug ? `https://checkout.infinitepay.io/${json.slug}` : null);

    if (!checkoutUrl) {
      console.error("Resposta da API InfinitePay:", json);
      throw new Error("URL de checkout não retornada pela InfinitePay");
    }

    await supabaseAdmin
      .from("shop_orders")
      .update({ payment_provider: "infinitepay", payment_session_id: json.slug || json.id || order.id })
      .eq("id", order.id);

    return { ok: true as const, url: checkoutUrl };
  });
