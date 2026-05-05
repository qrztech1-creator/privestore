// Extracts product list from a PDF catalog using Lovable AI (Gemini multimodal native PDF input)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { pdf_base64 } = await req.json();
    if (!pdf_base64) throw new Error("Missing pdf_base64");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const dataUrl = `data:application/pdf;base64,${pdf_base64}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "Você extrai catálogos de produtos de PDFs. Sempre chame a função extract_products com TODOS os produtos encontrados. Preços em reais como número decimal (ex: 129.90). Categorias coerentes (ex: Lingerie, Sapatos, Acessórios). Se não tiver descrição, deixe vazia.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia TODOS os produtos deste catálogo PDF." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_products",
              description: "Lista de produtos extraídos do catálogo",
              parameters: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        price: { type: "number" },
                        category: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["name", "price"],
                    },
                  },
                },
                required: ["products"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_products" } },
      }),
    });

    if (res.status === 429) return new Response(JSON.stringify({ error: "Limite de IA atingido. Aguarde." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI gateway ${res.status}: ${t.slice(0, 300)}`);
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { products: [] };

    return new Response(JSON.stringify({ products: args.products || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("import-products-pdf error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
