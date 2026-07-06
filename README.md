# Lounge by Gigi

Loja online editorial — Next.js 15 (App Router) · Supabase · Stripe · Printful.

**Site:** https://loungebygigi.online

## A experiência

- **Entrada** — ecrã inteiro Woman | Man com selo rotativo e transição cinematográfica.
- **Moodboards** — `/collections/women` e `/collections/men`: colagem editorial de categorias, fotografia sépia que ganha cor ao toque.
- **Categorias editoriais** — `/category/[id]`: papel claro, tipografia espaçada, imagem de capa sépia que ganha cor, chips de subcategorias e produtos com revelação suave. Cada categoria pode ter **subcategorias**: a página da categoria-mãe mostra também todas as peças das subcategorias.
- **Loja, produto, carrinho, conta e painel** — funcionalidades completas de e-commerce.

## Arquitetura (pensada para o plano gratuito)

- Dados numa única tabela `lounge_store` (Supabase) — chaves: settings, products, categories, orders, customers.
- **Cache por tags**: as páginas públicas são estáticas; qualquer gravação no painel invalida a tag `store` e o site atualiza em segundos. A Printful é consultada no máximo de 6 em 6 horas (ou quando o webhook dela dispara).
- **Pagamentos**: checkout Stripe com preços validados no servidor e recolha de morada; o webhook `checkout.session.completed` marca a encomenda como paga e **submete-a automaticamente à Printful** para produção e envio.
- Sem WebGL/3D: animações apenas em CSS + IntersectionObserver, leves em qualquer dispositivo e com `prefers-reduced-motion` respeitado.
- Painel → "Imagens do site": página de entrada (Woman | Man), página Sobre e imagem de cada categoria, tudo editável num só sítio.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencher valores
npm run dev
```

Sem Supabase configurada, o site funciona com os ficheiros `data/*.json` (modo local).

## Publicação

Ver **GUIA-PUBLICACAO.md** (passo-a-passo completo: Supabase, migração, Vercel, domínio, Stripe, Printful).

> Nota de segurança: credenciais vivem apenas em variáveis de ambiente / painel.
> Nunca escrever passwords, chaves ou o endereço do painel de administração neste ficheiro.
