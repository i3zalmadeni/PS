-- تفعيل نظام «احجز مرفق» في سجل الأنظمة والسماح بدور «منسق» عليه (يظهر في بطاقة النظام بالصفحة الرئيسية)
update public.systems set status = 'connected', name_ar = 'نظام احجز مرفق' where code = 'labeed_facilities';
alter table public.staff_roles drop constraint if exists staff_roles_coordinator_scope_chk;
alter table public.staff_roles add constraint staff_roles_coordinator_scope_chk
  check (role_code <> 'coordinator' or system_code is null or system_code = any (array['self_evaluation','teachers_community','smart_plans','labeed_facilities'])) not valid;
