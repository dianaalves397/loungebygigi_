# Guia de publicação — Lounge by Gigi (100% gratuito)

Tempo estimado: 15–20 minutos. Segue pela ordem.

---

## 0. Antes de tudo (segurança)

1. No GitHub → repositório → **Settings → General → Danger Zone → Change visibility → Private**.
2. Escolhe uma **password nova e forte** para o painel — a antiga esteve exposta no README público, considera-a comprometida.
3. Se as chaves antigas (Supabase service role, Stripe, Printful) alguma vez estiveram no repositório público, **revoga-as e gera novas** nos respetivos sites.

O novo endereço do painel é **`/lounge-atelier-772`** (o antigo `/lounge-control-926` deixou de existir).
Depois de publicar: `https://loungebygigi.online/lounge-atelier-772`

---

## 1. Criar a nova base de dados (Supabase, grátis)

1. Vai a https://supabase.com → **New project** (plano Free).
2. Quando o projeto abrir: **SQL Editor → New query** → cola o conteúdo de `supabase/schema.sql` → **Run**.
3. Em **Project Settings → API**, copia:
   - **Project URL** (ex.: `https://abcd.supabase.co`)
   - **service_role key** (secreta — nunca a ponhas no browser nem no repositório)

## 2. Migrar os dados da base antiga (se ela ainda existir)

No teu computador, dentro da pasta do projeto:

```bash
npm install
```

Depois (substitui pelos teus valores):

```bash
OLD_SUPABASE_URL=https://ANTIGA.supabase.co \
OLD_SUPABASE_SERVICE_ROLE_KEY=chave_antiga \
NEW_SUPABASE_URL=https://NOVA.supabase.co \
NEW_SUPABASE_SERVICE_ROLE_KEY=chave_nova \
node scripts/migrate-supabase.js
```

(Em Windows/PowerShell há instruções alternativas no topo do próprio ficheiro `scripts/migrate-supabase.js`.)

**Se a base antiga já não existir:** não faz mal — na primeira utilização o site faz seed automático a partir de `data/*.json`, e podes recriar produtos/definições no painel. A sincronização Printful volta a trazer os produtos.

## 2b. (Uma vez) Organizar as categorias novas

Para ativar a estrutura Sports · Summer · Loungewear · Acessórios (com as
categorias antigas como subcategorias), corre uma única vez:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ATUA.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=chave \
node scripts/setup-categorias.js
```

(Windows/PowerShell: instruções no topo do ficheiro.) Os produtos não são
alterados — passam a aparecer também na categoria-mãe. Depois podes criar
mais subcategorias no painel com o campo "Categoria-mãe".

## 3. Publicar na Vercel (grátis)

1. Envia o projeto atualizado para o GitHub (repo **privado**).
2. https://vercel.com → **Add New → Project** → importa o repositório.
3. Em **Environment Variables**, adiciona (ver `.env.example`):

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do novo projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key nova |
| `NEXT_PUBLIC_SITE_URL` | `https://loungebygigi.online` |
| `ADMIN_USER` | o teu novo utilizador |
| `ADMIN_PASSWORD` | a tua nova password forte |

4. **Deploy**.

## 4. Ligar o domínio loungebygigi.online

1. No projeto **antigo** da Vercel: Settings → Domains → **Remove** o domínio.
2. No projeto **novo**: Settings → Domains → **Add** `loungebygigi.online` (e `www.loungebygigi.online` → redirect). A Vercel indica os registos DNS se for preciso.

## 5. Ligar pagamentos (Stripe)

1. Entra no painel: `https://loungebygigi.online/lounge-atelier-772` → Pagamentos → ativa Stripe e cola a **Secret key** (`sk_live_...`).
2. No **Stripe Dashboard → Developers → Webhooks → Add endpoint**:
   - URL: `https://loungebygigi.online/api/webhooks/stripe`
   - Evento: `checkout.session.completed`
3. Copia o **Signing secret** (`whsec_...`) e cola-o no painel em "Stripe Webhook Secret".

É este webhook que marca as encomendas como pagas **e envia automaticamente a encomenda à Printful** (com a morada recolhida no checkout). Sem ele, as encomendas ficam "pending".

Para testar sem cobrar: usa primeiro as chaves de teste do Stripe (`sk_test_...`) e o cartão `4242 4242 4242 4242`.

## 6. Ligar a Printful

1. No painel → Integrações → Printful: ativa, cola o **API Token** (Printful → Settings → Stores → API) e o **Store ID**.
2. (Opcional, recomendado) Printful → Settings → Webhooks: adiciona
   `https://loungebygigi.online/api/webhooks/printful` para eventos de produto — assim a loja atualiza-se sozinha quando mudas produtos na Printful.
3. Confirma que "Envio automático de encomendas" está ativo no painel.
4. Na Printful, confirma que a loja tem **billing method** definido (é a Printful que cobra a produção quando a encomenda entra).

## 7. Verificação final (checklist)

- [ ] `https://loungebygigi.online` abre a página Woman | Man
- [ ] Woman/Man → moodboard → categoria → produto → carrinho
- [ ] Checkout de teste conclui e volta à página de sucesso
- [ ] No painel, a encomenda aparece como **paid/fulfilled**
- [ ] Na Printful, a encomenda de teste aparece (podes cancelá-la lá)
- [ ] Login no painel funciona com as credenciais novas

---

## Porque é que agora não estoiras os limites gratuitos

- As páginas públicas são servidas de **cache** e só se regeneram quando gravas algo no painel (ou de 6 em 6 horas) → CPU ≈ 0 por visita.
- A Printful deixou de ser consultada a cada visita (era isso que queimava o "fluid CPU").
- A Supabase quase só é lida quando a cache renova → egress mínimo. As imagens dos produtos vêm dos CDNs da Printful/Unsplash, não da Supabase.
- As imagens da página de entrada são ficheiros locais do site.

Se um dia o tráfego crescer muito, a arquitetura aguenta na mesma — a cache faz o trabalho pesado.

---

# PARTE 2 — Ligações, encomendas e quotas gratuitas

## A. Ligações ANTES de pôr na Vercel

1. **Supabase** (base de dados — já tens)
   - Precisas de 3 valores (Settings → API): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Corre uma vez, localmente: `node scripts/setup-categorias.js` (com as env vars) para a nova estrutura de categorias

2. **Stripe** (pagamentos)
   - Cria conta em stripe.com → Developers → API keys
   - Precisas de: `STRIPE_SECRET_KEY` (sk_live_... ou sk_test_... para testar) e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - O webhook configura-se DEPOIS do deploy (passo C)

3. **Printful** (produção/envio dos produtos print-on-demand)
   - printful.com → Settings → Stores → API → cria um token
   - Precisas de: `PRINTFUL_API_KEY`
   - (Se um dia usares Printify em vez de Printful, é outra integração — o site atual está ligado ao Printful)

4. **Password do painel**: `PANEL_PASSWORD` (a que quiseres)

## B. Pôr na Vercel

1. vercel.com → Add New → Project → importa a pasta do projeto (ou liga o GitHub)
2. Em "Environment Variables", cola TODAS as variáveis acima
3. Deploy. No fim recebes um URL `*.vercel.app`
4. Domínio: Settings → Domains → adiciona `loungebygigi.online` e segue as instruções de DNS

## C. Ligações DEPOIS do deploy

1. **Webhook do Stripe** (essencial para as encomendas!)
   - Stripe → Developers → Webhooks → Add endpoint
   - URL: `https://loungebygigi.online/api/stripe-webhook`
   - Eventos: `checkout.session.completed`
   - Copia o "Signing secret" → adiciona na Vercel como `STRIPE_WEBHOOK_SECRET` → Redeploy

2. **Teste de encomenda completo (modo teste do Stripe)**
   - Com as chaves sk_test_/pk_test_: compra qualquer produto com o cartão de teste `4242 4242 4242 4242`
   - Confirma: recebes a confirmação, a encomenda aparece no painel, e (para produtos Printful) aparece como rascunho/encomenda no dashboard da Printful
   - Só depois trocas para as chaves live

3. **O que garante que TUDO é encomendável**: qualquer produto criado no painel entra no checkout do Stripe; os que têm `printfulVariantId` seguem automaticamente para a Printful; os manuais (sem Printful) ficam na lista de encomendas do painel para tratares tu. Testa um de cada tipo.

## D. Como o site quase não gasta as quotas gratuitas

**Vercel** (o teu uso atual de Function Invocations veio de páginas dinâmicas — já corrigido):
- As páginas de categoria/produto são ESTÁTICAS com revalidação de 1h — servidas do cache do edge, sem invocar funções
- A escolha de edição (?from=women/men) é feita no browser, não no servidor
- `images.unoptimized` ativo: zero gastos de Image Optimization
- Funções só correm: no checkout, no webhook do Stripe, no painel, e 1×/hora por página para revalidar

**Supabase**:
- Todas as imagens editoriais/moodboard estão em `/public` (servidas pela Vercel) e as fotos de produto vêm do CDN da Printful → egress do Supabase ≈ 0
- A base de dados só guarda texto (produtos, categorias, encomendas) → décimas de MB
- Leituras em cache de 1h; escritas só quando editas no painel ou entra uma encomenda

Com visitas normais, deves ficar a <5% de todas as quotas gratuitas dos dois serviços.
