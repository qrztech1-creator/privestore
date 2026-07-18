// ============================================================
// InfinitePay — stub pré-cabeado.
// Preencher os secrets depois: INFINITEPAY_HANDLE, INFINITEPAY_CLIENT_ID,
// INFINITEPAY_CLIENT_SECRET, INFINITEPAY_WEBHOOK_SECRET.
// Docs: https://www.infinitepay.io/checkout-documentacao
// ============================================================
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
    const handle = process.env.INFINITEPAY_HANDLE;
    const clientId = process.env.INFINITEPAY_CLIENT_ID;
    const clientSecret = process.env.INFINITEPAY_CLIENT_SECRET;

    if (!handle || !clientId || !clientSecret) {
      return {
        ok: false as const,
        pending_setup: true,
        message:
          "InfinitePay ainda não configurada. Preencha os secrets INFINITEPAY_HANDLE, INFINITEPAY_CLIENT_ID e INFINITEPAY_CLIENT_SECRET para ativar o pagamento online.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("shop_orders")
      .select("id, total, guest_name, guest_email, items:shop_order_items(product_name, qty, unit_price)")
      .eq("id", data.order_id)
      .single();
    if (error || !order) throw new Error("Pedido não encontrado");

    // TODO: montar payload real conforme docs InfinitePay (Checkout API)
    // Exemplo abaixo é ilustrativo — ajustar quando as credenciais estiverem prontas.
    const payload = {
      handle,
      order_nsu: order.id,
      amount: Math.round(Number(order.total) * 100),
      description: `Pedido ${order.id.slice(0, 8)} — ${order.guest_name}`,
      customer: { name: order.guest_name, email: order.guest_email },
      redirect_url: data.success_url,
      cancel_url: data.cancel_url,
      items: (order.items || []).map((i: any) => ({
        name: i.product_name,
        quantity: i.qty,
        unit_price: Math.round(Number(i.unit_price) * 100),
      })),
    };

    const res = await fetch("https://api.infinitepay.io/v2/checkout/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`InfinitePay [${res.status}]: ${body}`);
    }
    const json = await res.json();
    await supabaseAdmin
      .from("shop_orders")
      .update({ payment_provider: "infinitepay", payment_session_id: json.id })
      .eq("id", order.id);

    return { ok: true as const, url: json.checkout_url, id: json.id };
  });
