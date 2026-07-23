// Module: Abandoned Checkout & Recovery System for Privê
// Prepares email templates, WhatsApp quick-links, and JSON payload structures for WhatsApp API integrations

export interface OrderWithDetails {
  id: string;
  created_at: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  address_line?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  message?: string | null;
  total: number;
  status: string;
  payment_provider?: string | null;
  payment_session_id?: string | null;
  items?: Array<{
    id?: string;
    product_name: string;
    variant_label?: string | null;
    qty: number;
    unit_price: number;
  }>;
}

/**
 * Generates an HTML notification email to be sent to the Privê team
 * when a customer clicks "Finalizar Compra"
 */
export function generateTeamCheckoutNotificationHTML(order: OrderWithDetails): string {
  const orderDate = new Date(order.created_at || Date.now()).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedItems = (order.items || [])
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.product_name}</strong>
        ${item.variant_label ? `<br/><small style="color: #777;">${item.variant_label}</small>` : ""}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}x</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">R$ ${Number(item.unit_price).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">R$ ${Number(item.unit_price * item.qty).toFixed(2)}</td>
    </tr>`
    )
    .join("");

  const addressFormatted = [
    order.address_line,
    order.address_city,
    order.address_state,
    order.address_zip ? `CEP ${order.address_zip}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const waLink = generateWhatsAppRecoveryLink(order.guest_phone || "", order);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>🚨 Novo Checkout Iniciado — Privê</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9f6f3; color: #222; margin: 0; padding: 20px;">
    <div style="max-w: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2d9cf; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #d4a574;">
        <h1 style="color: #8b3a4a; margin: 0; font-size: 24px;">🚨 Novo Checkout Iniciado!</h1>
        <p style="color: #666; font-size: 13px; margin-top: 5px;">Tentativa de compra registrada na boutique Privê</p>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #fffdfa; border-radius: 10px; border-left: 4px solid #d4a574;">
        <p style="margin: 3px 0;"><strong>ID do Pedido:</strong> #${order.id.slice(0, 8).toUpperCase()} (${order.id})</p>
        <p style="margin: 3px 0;"><strong>Data / Hora:</strong> ${orderDate}</p>
        <p style="margin: 3px 0;"><strong>Status:</strong> <span style="color: #d97706; font-weight: bold;">AGUARDANDO PAGAMENTO (Pendente)</span></p>
      </div>

      <h3 style="color: #333; margin-top: 25px; border-bottom: 1px solid #eee; padding-bottom: 8px;">👤 Dados do Cliente</h3>
      <p style="margin: 5px 0;"><strong>Nome:</strong> ${order.guest_name}</p>
      <p style="margin: 5px 0;"><strong>E-mail:</strong> <a href="mailto:${order.guest_email}" style="color: #8b3a4a;">${order.guest_email}</a></p>
      <p style="margin: 5px 0;"><strong>Telefone:</strong> ${order.guest_phone || "Não informado"}</p>
      <p style="margin: 5px 0;"><strong>Endereço de Entrega:</strong> ${addressFormatted || "Não informado"}</p>
      ${order.message ? `<p style="margin: 5px 0; color: #666;"><strong>Obs:</strong> ${order.message}</p>` : ""}

      <h3 style="color: #333; margin-top: 25px; border-bottom: 1px solid #eee; padding-bottom: 8px;">🛍️ Itens do Carrinho</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f4eee7; color: #555;">
            <th style="padding: 8px; text-align: left;">Item</th>
            <th style="padding: 8px; text-align: center;">Qtd</th>
            <th style="padding: 8px; text-align: right;">Unitário</th>
            <th style="padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${formattedItems}
        </tbody>
      </table>

      <div style="text-align: right; margin-top: 20px; font-size: 18px; color: #8b3a4a; font-weight: bold;">
        Total do Pedido: R$ ${Number(order.total).toFixed(2).replace(".", ",")}
      </div>

      ${
        order.guest_phone
          ? `
      <div style="margin-top: 30px; text-align: center;">
        <a href="${waLink}" target="_blank" style="display: inline-block; background: #25D366; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(37,211,102,0.3);">
          💬 Entrar em contato via WhatsApp com a Cliente
        </a>
      </div>`
          : ""
      }
    </div>
  </body>
  </html>
  `;
}

/**
 * Generates a pre-filled WhatsApp recovery link for Privê staff to reach out to the customer
 */
export function generateWhatsAppRecoveryLink(phone: string, order: OrderWithDetails): string {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  if (!cleanPhone) return "#";

  const firstName = order.guest_name ? order.guest_name.split(" ")[0] : "Cliente";
  const shortId = order.id.slice(0, 8).toUpperCase();

  const text = `Olá, ${firstName}! Tudo bem? 🌸

Notei que você iniciou a escolha das suas lingeries autorais na Privê (Pedido #${shortId}), mas a sua compra ainda não foi concluída.

Ficou com alguma dúvida sobre o tamanho, cor ou pagamento? Estou aqui no ateliê para te ajudar a finalizar! ✨

Link da loja: https://priveloja.com.br/loja/carrinho`;

  return `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Generates customer-facing recovery email HTML ("Você deixou itens na sua sacola Privê")
 */
export function generateCustomerRecoveryEmailHTML(order: OrderWithDetails): string {
  const firstName = order.guest_name ? order.guest_name.split(" ")[0] : "Cliente";
  const itemsCount = (order.items || []).reduce((sum, i) => sum + i.qty, 0);

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"/></head>
  <body style="font-family: Cormorant Garamond, serif, sans-serif; background: #0f0a0c; color: #f4eee7; margin: 0; padding: 30px 10px;">
    <div style="max-w: 550px; margin: 0 auto; background: #1a1416; border-radius: 24px; border: 1px solid rgba(212,165,116,0.3); padding: 40px text-align: center;">
      <h1 style="color: #d4a574; font-size: 28px; font-weight: normal; margin-bottom: 10px;">Suas lingeries estão te esperando ✨</h1>
      <p style="color: #bbb; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
        Olá, ${firstName}! Vimos que você deixou ${itemsCount} ${itemsCount === 1 ? "peça autoral" : "peças autorais"} reservadas no seu carrinho Privê.
      </p>

      <div style="margin: 25px 0;">
        <a href="https://priveloja.com.br/loja/carrinho" style="background: linear-gradient(135deg, #d4a574, #8b3a4a); color: #fff; text-decoration: none; padding: 15px 35px; border-radius: 50px; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; display: inline-block;">
          Finalizar Minha Escolha →
        </a>
      </div>

      <p style="color: #888; font-size: 12px; margin-top: 30px;">
        Privê — Ateliê de Lingerie Autoral. Envio discreto para todo o Brasil.
      </p>
    </div>
  </body>
  </html>
  `;
}

/**
 * Prepares a structured JSON payload for future automated WhatsApp API integrations
 * (e.g., Z-API, Evolution API, Baileys, WhatsApp Business API)
 */
export function formatCheckoutPayloadForWhatsAppAPI(order: OrderWithDetails) {
  const cleanPhone = (order.guest_phone || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  return {
    event: "checkout_initiated",
    timestamp: new Date().toISOString(),
    order_id: order.id,
    order_short_id: order.id.slice(0, 8).toUpperCase(),
    customer: {
      name: order.guest_name,
      first_name: order.guest_name ? order.guest_name.split(" ")[0] : "Cliente",
      email: order.guest_email,
      phone: formattedPhone,
      address: {
        line: order.address_line || "",
        city: order.address_city || "",
        state: order.address_state || "",
        zip: order.address_zip || "",
      },
    },
    order_summary: {
      items: (order.items || []).map((i) => ({
        name: i.product_name,
        variant: i.variant_label || null,
        qty: i.qty,
        unit_price: Number(i.unit_price),
        total_price: Number(i.unit_price * i.qty),
      })),
      total_amount: Number(order.total),
      currency: "BRL",
      status: order.status,
      payment_provider: order.payment_provider || "infinitepay",
    },
    recovery_links: {
      cart_url: "https://priveloja.com.br/loja/carrinho",
      whatsapp_chat_url: generateWhatsAppRecoveryLink(order.guest_phone || "", order),
    },
  };
}
