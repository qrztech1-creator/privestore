// ============================================================
// InfinitePay webhook — stub pré-cabeado.
// Configurar no painel InfinitePay apontando para:
//   https://<seu-dominio>/api/public/webhooks/infinitepay
// Secrets necessárias: INFINITEPAY_WEBHOOK_SECRET
// ============================================================
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/public/webhooks/infinitepay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.INFINITEPAY_WEBHOOK_SECRET;
        if (!secret) return new Response("infinitepay not configured", { status: 503 });

        const raw = await request.text();
        const signature = request.headers.get("x-infinitepay-signature") || "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("invalid signature", { status: 401 });
        }

        const event = JSON.parse(raw);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // TODO: mapear estrutura real conforme docs InfinitePay
        // Exemplo baseado em eventos comuns de checkout
        if (event.type === "payment.approved" || event.event === "paid") {
          const sessionId = event.data?.session_id || event.session_id;
          if (sessionId) {
            await supabaseAdmin
              .from("shop_orders")
              .update({ status: "paid" })
              .eq("payment_session_id", sessionId);
          }
        } else if (event.type === "payment.failed" || event.event === "cancelled") {
          const sessionId = event.data?.session_id || event.session_id;
          if (sessionId) {
            await supabaseAdmin
              .from("shop_orders")
              .update({ status: "cancelled" })
              .eq("payment_session_id", sessionId);
          }
        }

        return new Response("ok");
      },
    },
  },
});
