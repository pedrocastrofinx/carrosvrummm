-- Dryve Assinatura Hub - banco do Supabase.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run. Pode rodar de novo sem estragar nada.
-- ANTES: Authentication > Sign In / Providers > Email > DESLIGUE "Allow new users to sign up".
--        Sem isso qualquer pessoa na internet poderia criar conta e ler a tabela de precos privada.

-- 1) Perfis: papel de cada usuario (admin ou atendente) ------------------------------------------
create table if not exists public.perfis (
  id        uuid primary key references auth.users(id) on delete cascade,
  email     text,
  papel     text not null default 'atendente' check (papel in ('admin', 'atendente')),
  criado_em timestamptz not null default now()
);
alter table public.perfis enable row level security;

-- funcao que ignora RLS (security definer) para as policies nao entrarem em loop
create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin');
$$;

drop policy if exists "perfis: cada um le o seu"   on public.perfis;
drop policy if exists "perfis: admin le todos"     on public.perfis;
drop policy if exists "perfis: admin altera"       on public.perfis;
create policy "perfis: cada um le o seu" on public.perfis for select to authenticated using (id = auth.uid());
create policy "perfis: admin le todos"   on public.perfis for select to authenticated using (public.eh_admin());
create policy "perfis: admin altera"     on public.perfis for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
-- (nao ha policy de insert/delete: ninguem cria nem apaga perfil pelo navegador; o perfil nasce pelo gatilho abaixo)

create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.criar_perfil();

-- usuarios que ja existiam antes deste script
insert into public.perfis (id, email) select id, email from auth.users on conflict (id) do nothing;

-- 2) Tabelas privadas (ex.: precos da Localiza) --------------------------------------------------
-- Quem esta logado le. NINGUEM escreve pelo navegador: so o script tools/enviar_tabela_supabase.py,
-- que usa a chave service_role (essa chave ignora RLS e nunca vai para o navegador).
create table if not exists public.tabelas_privadas (
  chave         text primary key,
  dados         jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.tabelas_privadas enable row level security;
drop policy if exists "tabelas_privadas: logados leem" on public.tabelas_privadas;
create policy "tabelas_privadas: logados leem" on public.tabelas_privadas for select to authenticated using (true);

-- 3) Dar papel de admin a um usuario (troque o e-mail e rode so esta linha, depois de criar o usuario):
-- update public.perfis set papel = 'admin' where email = 'voce@empresa.com';
