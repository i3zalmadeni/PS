-- الدخول بمعرّف (أرقام أو حروف إنجليزية) بدل البريد الإلكتروني فقط.
-- المعرّف يُخزَّن هنا ويُترجم داخلياً إلى بريد غير حقيقي لحساب Supabase Auth: <المعرّف>@id.invalid
-- الحسابات القديمة المسجلة بالبريد تبقى تعمل كما هي.
alter table public.staff_private add column if not exists login_id text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'staff_private_login_id_fmt') then
    alter table public.staff_private
      add constraint staff_private_login_id_fmt
      check (login_id is null or login_id ~ '^[a-z0-9][a-z0-9._-]{2,39}$');
  end if;
end $$;

create unique index if not exists staff_private_login_id_uq
  on public.staff_private (lower(login_id)) where login_id is not null;
