// ============================================================
// InfinitePay Webhook — Notificação em tempo real de pagamento aprovado
// Endpoint: POST /api/public/webhooks/infinitepay
// Docs: https://api.checkout.infinitepay.io/links
// ============================================================
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/infinitepay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          console.log("Recebido Webhook InfinitePay:", body);

          const orderId = body.order_nsu;
          if (orderId) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin
              .from("shop_orders")
              .update({
                status: "paid",
                payment_session_id: body.invoice_slug || body.transaction_nsu || null,
              })
              .eq("id", orderId);
          }

          // A documentação exige resposta 200 rápida
          return new Response("OK", { status: 200 });
        } catch (err: any) {
          console.error("Erro no processamento do webhook InfinitePay:", err);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
