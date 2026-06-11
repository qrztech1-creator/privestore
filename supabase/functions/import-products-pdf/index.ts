// Extracts product list from page images (rendered client-side from PDF) using Lovable AI.
// Hardened with retry/backoff on transient 429/5xx so the UI doesn't see one-off failures.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callAI(payload: unknown, apiKey: string): Promise<Response> {
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return res;
      // Don't retry on hard errors meant for the client
      if (res.status === 402) return res;
      // Retry on 429 and 5xx
      if (res.status === 429 || res.status >= 500) {
        lastErr = `${res.status} ${await res.text().catch(() => "")}`;
        await sleep(800 * Math.pow(2, attempt)); // 0.8s, 1.6s, 3.2s
        continue;
      }
      return res;
    } catch (e) {
      lastErr = (e as Error).message;
      await sleep(800 * Math.pow(2, attempt));
    }
  }
  throw new Error(`AI gateway falhou após 3 tentativas: ${lastErr}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const pageImageUrls: string[] = body.page_image_urls || [];
    if (!pageImageUrls.length) throw new Error("Missing page_image_urls");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const userContent: any[] = [
      { type: "text", text: `Extraia TODOS os produtos deste catálogo. São ${pageImageUrls.length} páginas, na ordem.` },
      ...pageImageUrls.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const res = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Você extrai catálogos de produtos de imagens de páginas. Sempre chame extract_products com TODOS os produtos. Preço em reais como decimal (ex: 129.90). Categorias coerentes (ex: Lingerie, Sapatos, Acessórios). 'page' é o número (1-based) da imagem em que o produto aparece.",
        },
        { role: "user", content: userContent },
      ],
      tools: [{
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
                    page: { type: "integer" },
                  },
                  required: ["name", "price"],
                },
              },
            },
            required: ["products"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_products" } },
    }, LOVABLE_API_KEY);

    if (res.status === 429) return new Response(JSON.stringify({ error: "Limite de IA atingido. Aguarde alguns minutos e tente de novo." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no Workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
