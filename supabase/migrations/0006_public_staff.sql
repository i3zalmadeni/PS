alter table public.teachers add column if not exists show_public boolean not null default true;
create or replace function public.public_staff()
returns table (full_name text, specialty text, stage text)
language sql stable security definer set search_path = ''
as $$ select t.full_name, t.specialty, t.stage from public.teachers t where t.is_active and t.show_public order by t.full_name limit 200; $$;
revoke all on function public.public_staff() from public;
grant execute on function public.public_staff() to anon, authenticated;
