// Extracts product list from a PDF catalog using Lovable AI (Gemini multimodal)
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function extractText(bytes: Uint8Array): Promise<string> {
  // @ts-ignore - disable worker (Deno)
  const loadingTask = pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false, disableFontFace: true });
  const pdf = await loadingTask.promise;
  let text = "";
  const max = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= max; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((it: any) => it.str).join(" ");
    text += `\n--- Página ${i} ---\n${pageText}`;
  }
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { pdf_base64 } = await req.json();
    if (!pdf_base64) throw new Error("Missing pdf_base64");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // decode base64 to bytes
    const bin = atob(pdf_base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const text = await extractText(bytes);
    if (!text.trim()) throw new Error("PDF sem texto extraível (talvez seja imagem escaneada)");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Você extrai catálogos de produtos de PDFs. Sempre responda chamando a função extract_products com a lista completa encontrada. Preços em reais, número decimal (ex: 129.90). Se categoria não for clara, deduza pelo contexto.",
          },
          { role: "user", content: `Extraia TODOS os produtos do catálogo abaixo:\n\n${text.slice(0, 60000)}` },
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
    if (!res.ok) throw new Error(`AI gateway error: ${res.status} ${await res.text()}`);

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
