-- فصل «سجل المنسوبين» (عرض فقط للعاملين) عن «المستخدمين والصلاحيات» (كل التعديلات).

-- 1) حالات إضافية للمنسوب: متقاعد ومؤرشف (لا تُعدّان على رأس العمل: is_active عمود محسوب)
alter table public.staff_members drop constraint if exists staff_members_employment_status_check;
alter table public.staff_members add constraint staff_members_employment_status_check
  check (employment_status in ('active','on_leave','transferred','ended','retired','archived'));

-- 2) صلاحية خاصة: إدارة المستخدمين بشكل كامل
insert into public.permissions (code, name_ar, system_code, level)
select 'users:manage', 'المستخدمون والصلاحيات – إدارة كاملة', null, 'edit'
where not exists (select 1 from public.permissions where code = 'users:manage');

-- 3) حساب محمي: من يحمل دور مدير النواة أو مدير المدرسة. لا يعدّله إلا مدير النواة.
create or replace function public.is_protected_staff(p uuid) returns boolean
language sql stable security definer set search_path to '' as $f$
  select exists (select 1 from public.staff_roles r
    where r.staff_id = p and r.role_code in ('core_admin','principal') and r.ended_on is null) $f$;
grant execute on function public.is_protected_staff(uuid) to authenticated;

-- 4) سياسات: صاحب users:manage يدير المنسوبين وبياناتهم الخاصة وأدوارهم وصلاحياتهم،
--    دون المساس بالحسابات المحمية، ودون منح دور مدير النواة/المدرسة أو صلاحية users:manage نفسها.
drop policy if exists staff_i on public.staff_members;
create policy staff_i on public.staff_members for insert to authenticated
  with check (public.core_can('personnel:add') or public.core_can('users:manage'));

drop policy if exists staff_u on public.staff_members;
create policy staff_u on public.staff_members for update to authenticated
  using (public.core_can('personnel:edit') or (public.core_can('users:manage') and not public.is_protected_staff(id)))
  with check (public.core_can('personnel:edit') or (public.core_can('users:manage') and not public.is_protected_staff(id)));

drop policy if exists sp_r on public.staff_private;
create policy sp_r on public.staff_private for select to authenticated
  using (public.is_core_admin() or staff_id = public.current_staff_id() or public.core_can('personnel_contact:view') or public.core_can('users:manage'));

drop policy if exists sp_i on public.staff_private;
create policy sp_i on public.staff_private for insert to authenticated
  with check (public.core_can('personnel:add') or (public.core_can('users:manage') and not public.is_protected_staff(staff_id)));

drop policy if exists sp_u on public.staff_private;
create policy sp_u on public.staff_private for update to authenticated
  using (public.core_can('personnel:edit') or (public.core_can('users:manage') and not public.is_protected_staff(staff_id)))
  with check (public.core_can('personnel:edit') or (public.core_can('users:manage') and not public.is_protected_staff(staff_id)));

drop policy if exists sroles_r on public.staff_roles;
create policy sroles_r on public.staff_roles for select to authenticated
  using (public.is_core_admin() or public.core_can('users:manage')
         or staff_id in (select id from public.staff_members where user_id = auth.uid()));

drop policy if exists sroles_w on public.staff_roles;
create policy sroles_w on public.staff_roles for all to authenticated
  using (public.is_core_admin() or (public.core_can('users:manage') and role_code not in ('core_admin','principal') and not public.is_protected_staff(staff_id)))
  with check (public.is_core_admin() or (public.core_can('users:manage') and role_code not in ('core_admin','principal') and not public.is_protected_staff(staff_id)));

drop policy if exists sperm_r on public.staff_permissions;
create policy sperm_r on public.staff_permissions for select to authenticated
  using (public.is_core_admin() or public.core_can('users:manage')
         or staff_id in (select id from public.staff_members where user_id = auth.uid()));

drop policy if exists sperm_w on public.staff_permissions;
create policy sperm_w on public.staff_permissions for all to authenticated
  using (public.is_core_admin() or (public.core_can('users:manage') and permission_code <> 'users:manage' and not public.is_protected_staff(staff_id)))
  with check (public.is_core_admin() or (public.core_can('users:manage') and permission_code <> 'users:manage' and not public.is_protected_staff(staff_id)));
