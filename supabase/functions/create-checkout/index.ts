// Creates a Stripe Checkout Session for an order.
// Body: { order_id: string, success_url: string, cancel_url: string }
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_KEY) throw new Error("STRIPE_SECRET_KEY não configurada");
    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-11-20.acacia" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { order_id, success_url, cancel_url } = await req.json();
    if (!order_id) throw new Error("order_id obrigatório");

    const { data: order, error } = await supabase
      .from("orders")
      .select("*, items:order_items(*), event:events(bride_name)")
      .eq("id", order_id)
      .single();
    if (error || !order) throw new Error("Pedido não encontrado");

    const line_items = (order.items || []).map((i: any) => ({
      quantity: i.qty,
      price_data: {
        currency: "brl",
        unit_amount: Math.round(Number(i.unit_price) * 100),
        product_data: {
          name: i.product_name,
          description: `Presente para ${order.event?.bride_name || "noiva"}`,
        },
      },
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      customer_email: order.guest_email || undefined,
      success_url: success_url || `${req.headers.get("origin")}/?paid=1`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/?canceled=1`,
      metadata: { order_id: order.id, event_id: order.event_id, guest_name: order.guest_name },
    });

    await supabase.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
