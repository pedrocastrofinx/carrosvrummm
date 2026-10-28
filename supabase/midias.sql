-- Dryve Hub: biblioteca de videos/fotos COMPARTILHADA (arquivos para baixar).
-- Rode UMA vez no Supabase > SQL Editor (depois do schema.sql). Pode rodar de novo sem estragar nada.
-- Quem envia: administrador. Quem ve e baixa: qualquer usuario logado.
-- Limite de arquivo: 50 MB (plano gratuito do Supabase). Em plano pago, aumente file_size_limit abaixo e em Storage > Settings.

-- 1) Registro de cada midia (a mesma lista para todos os analistas) ------------------------------
create table if not exists public.midias_compartilhadas (
  id               uuid primary key,
  tipo             text not null check (tipo in ('video', 'foto', 'modelo3d')),
  titulo           text not null,
  descricao        text not null default '',
  categoria        text not null default 'outros',
  marca            text not null default '',
  modelo           text not null default '',
  versao           text not null default '',
  locadora         text not null default '',
  todas_versoes    boolean not null default false,   -- vale para todas as versoes do modelo
  storage_path     text not null,
  thumb_path       text,
  nome_original    text not null default '',
  tamanho          bigint not null default 0,
  permite_download boolean not null default true,
  tags             text[] not null default '{}',
  autorizacao      text not null default '',
  cliente          jsonb,
  criado_em        timestamptz not null default now()
);
alter table public.midias_compartilhadas enable row level security;
drop policy if exists "midias: logados leem"  on public.midias_compartilhadas;
drop policy if exists "midias: admin insere"  on public.midias_compartilhadas;
drop policy if exists "midias: admin altera"  on public.midias_compartilhadas;
drop policy if exists "midias: admin apaga"   on public.midias_compartilhadas;
create policy "midias: logados leem" on public.midias_compartilhadas for select to authenticated using (true);
create policy "midias: admin insere" on public.midias_compartilhadas for insert to authenticated with check (public.eh_admin());
create policy "midias: admin altera" on public.midias_compartilhadas for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "midias: admin apaga"  on public.midias_compartilhadas for delete to authenticated using (public.eh_admin());

-- 2) Bucket privado para os arquivos (ninguem acessa sem login; o download usa link assinado e temporario) ---
insert into storage.buckets (id, name, public, file_size_limit)
values ('midias', 'midias', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "midias storage: logados leem" on storage.objects;
drop policy if exists "midias storage: admin envia"  on storage.objects;
drop policy if exists "midias storage: admin altera" on storage.objects;
drop policy if exists "midias storage: admin apaga"  on storage.objects;
create policy "midias storage: logados leem" on storage.objects for select to authenticated using (bucket_id = 'midias');
create policy "midias storage: admin envia"  on storage.objects for insert to authenticated with check (bucket_id = 'midias' and public.eh_admin());
create policy "midias storage: admin altera" on storage.objects for update to authenticated using (bucket_id = 'midias' and public.eh_admin()) with check (bucket_id = 'midias' and public.eh_admin());
create policy "midias storage: admin apaga"  on storage.objects for delete to authenticated using (bucket_id = 'midias' and public.eh_admin());
