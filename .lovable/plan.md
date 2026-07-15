# Plano

## 1. Corrigir erro "Something went wrong" nos links (Pré-visualizar / Página pública / Copiar link)

Os 3 botões abrem `/n/{slug}` (rota pública do evento) ou copiam esse URL. O erro genérico vem do `errorComponent` da rota. Vou:

- Adicionar tratamento defensivo em `src/routes/n.$slug.tsx` para quando as RPCs `get_public_event_by_slug` / `get_event_products_for_guest` retornam vazio (evento arquivado, slug inválido, RLS bloqueando).
- Melhorar o `errorComponent` para mostrar a mensagem real (não só "something went wrong") e um botão "Voltar ao painel".
- Verificar se o `loader` está chamando função protegida em rota pública (isso quebra em SSR — causa comum do erro atual). Se estiver, mover para `useQuery` no componente.
- Rodar via Playwright depois pra confirmar que os 3 links abrem corretamente.

## 2. Loja pública independente em `/loja` (compartilha estoque global)

### Rota nova
`src/routes/loja.index.tsx` — catálogo público de todos os produtos ativos, agrupado por linha/categoria, com filtros.

`src/routes/loja.$slug.tsx` — página de detalhe de produto (variações de cor/tamanho, galeria, botão comprar / favoritar / avisar quando chegar).

`src/routes/loja.carrinho.tsx` — carrinho + checkout (pede nome, email, telefone, endereço).

`src/routes/loja.conta.tsx` (sob `_authenticated`) — pedidos da cliente, favoritos, lista de espera, notificações.

### Banco (migration)
- `shop_customers` (id, user_id, name, email, phone, address).
- `shop_orders` + `shop_order_items` (separados de `orders`/`order_items` das noivas, mas consomem o **mesmo estoque** em `product_variants.stock`).
- `shop_favorites` (customer_id, product_id).
- `shop_waitlist` (customer_id, product_id, variant_id, notified_at) — trigger em `product_variants` UPDATE dispara notificação por email quando `stock` passa de 0 → >0.
- Triggers de estoque: reaproveitar `bump_variant_stock`/`unbump_variant_stock` no `shop_order_items`.
- RLS: cliente só vê seus próprios pedidos/favoritos/waitlist; catálogo lê produtos ativos com policy `TO anon SELECT`.

### Estoque global compartilhado
- `product_variants.stock` é a **única fonte de verdade**.
- Quando alguém compra na loja OU numa lista de noiva, o mesmo `stock` diminui.
- Na página `/n/{slug}` e `/loja/{slug}` a UI mostra "esgotado" quando `stock = 0`.

### Auth da loja
Email + senha + Google (usa o auth existente). Cliente vira `user_roles = 'customer'`. Rota `/loja/conta` gated por `_authenticated`.

## 3. Notificação de reposição

- Configurar **Lovable Emails** (domínio próprio necessário — vou pedir na hora de configurar).
- Trigger no `product_variants` (AFTER UPDATE) enfileira 1 email por linha da `shop_waitlist` que aguarda aquela variante.
- Template `back-in-stock.tsx` com nome do produto, imagem, botão "comprar agora".
- Cliente pode gerenciar a lista de espera em `/loja/conta`.

## 4. Integração InfinitePay (API completa — Checkout embutido)

### O que precisa da sua conta (passo a passo)

**Passo 1 — Ter conta InfinitePay verificada.** Se ainda não tem, criar em https://infinitepay.io e completar o cadastro (CNPJ ou CPF, dados bancários, verificação de identidade).

**Passo 2 — Achar seu handle público.** No painel InfinitePay → seu perfil → é o `@seuusuario` que aparece na URL do seu link de pagamento (ex: `https://loja.infinitepay.io/seuhandle`). Só precisa disso pra Checkout via Link.

**Passo 3 (só se for API completa) — Gerar credenciais de API.** No painel InfinitePay:
1. Menu **Desenvolvedores** → **Chaves de API** (ou **Integrações**).
2. Clicar em **Gerar nova chave** → escolher escopo **"Pagamentos"**.
3. Copiar o **Client ID** e **Client Secret** (o secret só aparece 1 vez — salvar).
4. Configurar o **Webhook URL** apontando para `https://privestore.lovable.app/api/public/webhooks/infinitepay` (URL que vou criar).
5. Copiar o **Webhook Secret**.

**Passo 4 — Me passar aqui os 4 valores** (via `add_secret`, seguro):
- `INFINITEPAY_HANDLE` — seu @handle
- `INFINITEPAY_CLIENT_ID`
- `INFINITEPAY_CLIENT_SECRET`
- `INFINITEPAY_WEBHOOK_SECRET`

### Implementação
- Server function `create-infinitepay-checkout.functions.ts` — recebe `order_id`, chama API InfinitePay pra criar sessão, retorna URL.
- Server route `src/routes/api/public/webhooks/infinitepay.ts` — recebe callback, valida HMAC, marca pedido como pago, dispara estoque.
- Substitui/coexiste com Stripe (você decide se remove o Stripe depois).

## Ordem de execução

1. Fix dos 3 links quebrados (rápido, isolado).
2. Migration: tabelas `shop_*`, triggers, RLS.
3. Rotas `/loja/*` + carrinho + checkout.
4. Setup Lovable Emails + template reposição + trigger.
5. InfinitePay: aguardo você me passar os secrets, aí implemento checkout + webhook.

## Detalhes técnicos

- Cart da loja separado do cart de noiva (novo store zustand `useShopCart`).
- Reserva de estoque: ao criar pedido, decrementa `stock` imediatamente (trigger existente). Se pagamento falhar/expirar em 30min, cancelar pedido → trigger devolve estoque.
- Waitlist: unique(`customer_id`, `variant_id`) pra evitar duplicatas.
- Email queue já suporta throttling — reposição de estoque em massa não vai spammar.

Posso começar pelos itens 1–4 agora; o item 5 (InfinitePay) espera você seguir o passo a passo acima e me passar os 4 valores.
