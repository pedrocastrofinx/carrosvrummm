-- Permite ligar uma mesma midia a VARIOS veiculos (ex.: a mesma Toro na Movida e na Localiza).
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run. Nao apaga nada.
alter table public.midias_compartilhadas add column if not exists vinculos jsonb not null default '[]'::jsonb;
notify pgrst, 'reload schema';
