-- Base de dados da Lounge by Gigi (Supabase, plano gratuito)
-- Uma única tabela chave→JSON: settings, products, categories, orders, customers.
-- Nota: a versão antiga tinha o nome com gralha ("louge_store"); o código usa
-- "lounge_store" — este ficheiro corrige isso.

create table if not exists public.lounge_store (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.lounge_store enable row level security;

-- Sem políticas públicas: só a service role (usada pelo servidor) acede.
-- Isto impede leituras diretas por terceiros e poupa egress.

create index if not exists lounge_store_updated_at_idx
  on public.lounge_store (updated_at desc);
