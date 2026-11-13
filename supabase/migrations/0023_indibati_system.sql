-- تسجيل نظام «انضباطي» (الحضور والغياب والتأخر) في سجل الأنظمة، وصلاحياته، والسماح بدور «منسق» عليه.
-- لا يغيّر أي بيانات قائمة. جداول النظام التشغيلية (ind_*) في مستودع indibati.
insert into public.systems (code, name_ar, description, status, scopes)
values ('indibati', 'نظام انضباطي', 'الحضور والغياب والتأخر والانضباط المدرسي', 'planned',
        array['school:read','staff:read','students:read','identity:verify','changes:read'])
on conflict (code) do nothing;
insert into public.permissions (code, system_code, level, name_ar) values
  ('indibati:view', 'indibati', 'view', 'انضباطي: اطلاع'),
  ('indibati:add', 'indibati', 'add', 'انضباطي: إضافة'),
  ('indibati:edit', 'indibati', 'edit', 'انضباطي: تعديل'),
  ('indibati:approve', 'indibati', 'approve', 'انضباطي: اعتماد')
on conflict (code) do nothing;
alter table public.staff_roles drop constraint if exists staff_roles_coordinator_scope_chk;
alter table public.staff_roles add constraint staff_roles_coordinator_scope_chk
  check (role_code <> 'coordinator' or system_code is null or system_code = any (array['self_evaluation','teachers_community','smart_plans','labeed_facilities','indibati'])) not valid;
