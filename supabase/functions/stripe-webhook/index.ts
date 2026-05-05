// Stripe webhook to mark orders as paid.
// Configure STRIPE_WEBHOOK_SECRET secret and add this URL in Stripe dashboard.
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  try {
    const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const WH_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-11-20.acacia" });
    const sig = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;
    if (WH_SECRET && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, WH_SECRET);
    } else {
      event = JSON.parse(body);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (orderId) {
        await supabase.from("orders").update({
          status: "paid",
          paid_at: new Date().toISOString(),
        }).eq("id", orderId);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("stripe-webhook error", e);
    return new Response((e as Error).message, { status: 400 });
  }
});
