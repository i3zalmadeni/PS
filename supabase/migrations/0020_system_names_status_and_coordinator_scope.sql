-- إرجاع حالة النظام لتصفية الأنظمة غير المفعّلة في نافذة الأدوار والصلاحيات
drop function if exists public.system_names();
create function public.system_names() returns table(code text, name_ar text, status text)
language sql stable security definer set search_path to '' as $f$
  select s.code, s.name_ar, s.status from public.systems s where public.core_can('users:manage') $f$;
grant execute on function public.system_names() to authenticated;

-- السماح بدور «منسق» على نظام الخطط الذكية
alter table public.staff_roles drop constraint if exists staff_roles_coordinator_scope_chk;
alter table public.staff_roles add constraint staff_roles_coordinator_scope_chk
  check (role_code <> 'coordinator' or system_code is null or system_code = any (array['self_evaluation','teachers_community','smart_plans'])) not valid;
