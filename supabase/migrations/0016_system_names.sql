-- أسماء الأنظمة (دون مفاتيحها) لمن يملك صلاحية إدارة المستخدمين، لعرضها في نافذة الأدوار والصلاحيات.
create or replace function public.system_names() returns table(code text, name_ar text)
language sql stable security definer set search_path to '' as $f$
  select s.code, s.name_ar from public.systems s where public.core_can('users:manage') $f$;
grant execute on function public.system_names() to authenticated;
