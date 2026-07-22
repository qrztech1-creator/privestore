import { createServerFn } from "@tanstack/react-start";

interface Input {
  order_id: string;
  success_url?: string;
  cancel_url?: string;
}

export const createInfinitepayCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: Input) => {
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
    // A API retorna a URL do checkout em `url`, `checkout_url` ou `link`
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
