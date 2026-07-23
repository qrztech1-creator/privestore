import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("token") !== "prive123") {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          // Fetch all data
          const [
            { data: categories },
            { data: product_lines },
            { data: products },
            { data: product_variants },
            { data: product_images },
            { data: orders },
            { data: order_items },
            { data: profiles },
          ] = await Promise.all([
            supabaseAdmin.from("categories").select("*"),
            supabaseAdmin.from("product_lines").select("*"),
            supabaseAdmin.from("products").select("*"),
            supabaseAdmin.from("product_variants").select("*"),
            supabaseAdmin.from("product_images").select("*"),
            supabaseAdmin.from("shop_orders").select("*"),
            supabaseAdmin.from("shop_order_items").select("*"),
            supabaseAdmin.from("profiles").select("*"),
          ]);

          return new Response(
            JSON.stringify({
              categories,
              product_lines,
              products,
              product_variants,
              product_images,
              orders,
              order_items,
              profiles,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
