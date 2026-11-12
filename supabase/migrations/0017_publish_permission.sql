-- النشر في الموقع العام من اختصاص مدير النواة/المدرسة ومن يُمنح صلاحية «publish:manage» (منسق بوابة النواة)،
-- وليس لكل من يعدّل بيانات المنسوبين أو لصاحب البيانات نفسه.

-- 1) الصلاحية
insert into public.permissions (code, name_ar, system_code, level)
select 'publish:manage', 'النشر في الموقع العام – إدارة', null, 'edit'
where not exists (select 1 from public.permissions where code = 'publish:manage');

-- 2) منع تغيير حالة نشر المنسوب أو صورته العامة لغير المخوّلين (العمليات من الخادم بلا مستخدم تمر)
create or replace function public.guard_staff_publish() returns trigger
language plpgsql security definer set search_path to '' as $f$
begin
  if auth.uid() is not null and not public.core_can('publish:manage') and (
       (tg_op = 'INSERT' and (coalesce(new.publish_public,false) or new.public_photo_path is not null))
    or (tg_op = 'UPDATE' and (new.publish_public is distinct from old.publish_public or new.public_photo_path is distinct from old.public_photo_path))
  ) then
    raise exception 'النشر في الموقع العام من اختصاص مدير النواة أو منسق البوابة' using errcode = '42501';
  end if;
  return new;
end $f$;
drop trigger if exists t_guard_staff_publish on public.staff_members;
create trigger t_guard_staff_publish before insert or update on public.staff_members
  for each row execute function public.guard_staff_publish();

-- 3) المفتاح العام للمدرسة
create or replace function public.guard_school_publish() returns trigger
language plpgsql security definer set search_path to '' as $f$
begin
  if auth.uid() is not null and new.publish_public is distinct from old.publish_public and not public.core_can('publish:manage') then
    raise exception 'النشر في الموقع العام من اختصاص مدير النواة أو منسق البوابة' using errcode = '42501';
  end if;
  return new;
end $f$;
drop trigger if exists t_guard_school_publish on public.school_profile;
create trigger t_guard_school_publish before update on public.school_profile
  for each row execute function public.guard_school_publish();

-- 4) مخزن الصور العامة
drop policy if exists pubph_ins on storage.objects;
drop policy if exists pubph_upd on storage.objects;
drop policy if exists pubph_del on storage.objects;
create policy pubph_ins on storage.objects for insert to authenticated with check (bucket_id = 'public-photos' and public.core_can('publish:manage'));
create policy pubph_upd on storage.objects for update to authenticated using (bucket_id = 'public-photos' and public.core_can('publish:manage'));
create policy pubph_del on storage.objects for delete to authenticated using (bucket_id = 'public-photos' and public.core_can('publish:manage'));

-- 5) منح هذه الصلاحية لمدير النواة/المدرسة فقط (لا يمنحها صاحب users:manage)
drop policy if exists sperm_w on public.staff_permissions;
create policy sperm_w on public.staff_permissions for all to authenticated
  using (public.is_core_admin() or (public.core_can('users:manage') and permission_code not in ('users:manage','publish:manage') and not public.is_protected_staff(staff_id)))
  with check (public.is_core_admin() or (public.core_can('users:manage') and permission_code not in ('users:manage','publish:manage') and not public.is_protected_staff(staff_id)));
