
# Plano de finalização da plataforma Privê

Vou trabalhar em 6 fases. Cada fase é um conjunto coeso entregue de uma vez.

## Fase 1 — Plataforma fechada + único login admin

**Objetivo:** ninguém se cadastra. Só admin loga. Noivas e convidados acessam via link secreto.

- Remover a aba "Criar conta" do `/login` (login fica só email/senha).
- Criar a conta admin `contatopriveloja@gmail.com` / `Prive@2026` direto no backend (via SQL/admin), com email já confirmado e role `admin` atribuída no `user_roles`.
- Bloquear novos signups: desabilitar self-signup no Auth e remover o trigger `handle_new_user` que dava role `bride` automática.
- Substituir o conceito de "noiva como usuária autenticada" por **token de acesso à gestão**: cada evento gera um `manage_token` (rota `/g/$token` — painel da noiva) além do `invite_token` já existente (`/c/$token` — convidado).
- Remover o botão "Tornar-me admin" e a tela de signup pública.
- Ajustar `PanelShell` para não exigir `auth.user` quando o acesso for por token.

**Resultado:** apenas o admin loga em `/login`. Noivas recebem link `/g/{token}` para gerenciar a página dela. Convidados recebem `/c/{token}` para presentear.

## Fase 2 — Painel admin reformulado (UX visual)

Resolve a queixa de "ficar perdida entre menus".

- `/admin` vira **dashboard executivo** com:
  - Cards de KPI (eventos ativos, pedidos do mês, receita, ticket médio, top noivas).
  - Gráficos (Recharts): receita por mês, pedidos por status, top produtos, conversão por evento.
  - Filtros avançados (período, status, noiva, categoria).
- `/admin/eventos`: lista visual de noivas com busca, filtro por status/data, ações rápidas (copiar link da noiva, copiar link público, ver pedidos do evento, abrir página).
- Ao entrar em uma noiva: navegação **em abas no topo** (Página · Lista de presentes · Pedidos · Convites · Configurações) — abas sempre visíveis, com breadcrumb "Admin › Noiva X › aba atual" e botão "voltar". Acaba a confusão de mudar de menu lateral.
- Sidebar com badge de contagens (pedidos pendentes, etc.).

## Fase 3 — Importar catálogo via PDF (IA)

Para a admin não cadastrar produto a produto.

- Botão "Importar PDF" na tela `/admin/produtos`.
- Server function que recebe o PDF, extrai texto/imagens (pdfjs no servidor) e envia para Lovable AI (Gemini) com prompt estruturado para retornar JSON: `[{name, description, price, category, image_hint}]`.
- Tela de **revisão antes de importar**: tabela editável onde a admin confere/ajusta nome, preço, categoria e marca quais entram. Imagens detectadas no PDF ficam pareadas; nas que faltarem, oferece "gerar com IA" (já temos `generate-banner`, vou generalizar para `generate-image`).
- Ao confirmar: insere em massa em `products`.

## Fase 4 — Pedidos, pagamento e checkout

- Hoje o checkout é só WhatsApp. Vou **integrar pagamento via Stripe (built-in Lovable Payments)** para a noiva/convidado pagar online, mantendo WhatsApp como fallback.
  - Antes de habilitar, rodo `recommend_payment_provider` (presentes digitais → Stripe).
  - Checkout cria `order` + `order_items`, gera Stripe Checkout Session, redireciona.
  - Webhook `/api/public/stripe-webhook` confirma pagamento → muda `order.status` para `paid` → dispara `bump_purchased_qty` (já existe).
- `/admin/pedidos`: filtros (status, data, evento, valor), busca por convidado, exportar CSV, ações (marcar entregue, reembolsar, ver detalhes do pedido com itens).
- Painel da noiva também mostra os pedidos dela (somente leitura + marcar como recebido).

## Fase 5 — Catálogo e gestão de usuárias polidos

- `/admin/produtos`: filtros por categoria, busca, ativar/desativar, duplicar, ordenação, paginação, upload em lote de imagens.
- `/admin/usuarios`: agora vira **"Noivas"** (já que não há mais cadastro público). Lista todas as noivas (uma por evento), com link para gerar/regerar `manage_token`, status, contato, total gasto pelos convidados.

## Fase 6 — Premium + auditoria final dos 22 itens

Ao final, faço passada nos 22 itens do prompt original e marco o que foi feito. Itens premium adicionais que vou incluir:
- Mensagem de agradecimento personalizável por noiva (enviada após pagamento).
- QR Code do link público pronto para imprimir no convite.
- Modo "preview" da página da noiva direto do painel.
- Lazy-load de imagens + redução do peso do Three.js (só na home/hero) para resolver lentidão.
- Toasts e estados de loading consistentes.

---

## Detalhes técnicos

**Banco (migration):**
- `events`: adicionar `manage_token text unique` + `thank_you_message text` + `stripe_enabled boolean`.
- `orders`: adicionar `stripe_session_id`, `paid_at`, `delivered_at`.
- Remover trigger `on_auth_user_created` que insere `bride` em `user_roles` (não há mais signup).
- Policy: permitir update em `events` quando `manage_token` válido (via RPC `set_config('app.manage_token', ...)`).

**Auth:**
- Desabilitar `enable_signup` no Auth via `configure_auth`.
- Inserir admin com `supabaseAdmin.auth.admin.createUser` em migration/server fn one-shot.

**PDF parsing:**
- Server function (`createServerFn`) usando `pdfjs-dist` (Worker-compat) → extrai texto → manda pro Gateway de IA Lovable (`google/gemini-2.5-pro`) com schema JSON.

**Pagamentos:**
- `payments--recommend_payment_provider` → `payments--enable_stripe_payments`.
- Após habilitar, sigo o knowledge file recebido para criar checkout + webhook.

**Performance:**
- Three.js só no hero da home (já está). Páginas internas sem partículas.
- `loading="lazy"` em todas as `<img>`. Compressão automática no upload (canvas resize 1600px max).

---

## Confirmações antes de começar

1. **Senha admin:** vou criar exatamente `contatopriveloja@gmail.com` / `Prive@2026`. Confirma que pode ser essa? (recomendo trocar depois do primeiro login).
2. **Stripe:** habilitar pagamento online de presentes via Stripe é OK? (sem isso, fica só WhatsApp como hoje).
3. **Acesso da noiva:** confirma o modelo de **link secreto** (sem login/senha) para a noiva gerenciar — qualquer um com o link consegue editar a página dela. Se preferir senha por evento, eu adiciono um PIN opcional.

Posso começar pela Fase 1 assim que aprovar.
