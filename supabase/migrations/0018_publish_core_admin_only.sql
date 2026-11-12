-- النشر في الموقع العام لمدير النواة الرقمية وحده (is_core_admin)؛ يُلغى مفهوم صلاحية publish:manage.
create or replace function public.guard_staff_publish() returns trigger
language plpgsql security definer set search_path to '' as $f$
begin
  if auth.uid() is not null and not public.is_core_admin() and (
       (tg_op = 'INSERT' and (coalesce(new.publish_public,false) or new.public_photo_path is not null))
    or (tg_op = 'UPDATE' and (new.publish_public is distinct from old.publish_public or new.public_photo_path is distinct from old.public_photo_path))
  ) then
    raise exception 'النشر في الموقع العام من اختصاص مدير النواة الرقمية' using errcode = '42501';
  end if;
  return new;
end $f$;

create or replace function public.guard_school_publish() returns trigger
language plpgsql security definer set search_path to '' as $f$
begin
  if auth.uid() is not null and new.publish_public is distinct from old.publish_public and not public.is_core_admin() then
    raise exception 'النشر في الموقع العام من اختصاص مدير النواة الرقمية' using errcode = '42501';
  end if;
  return new;
end $f$;

drop policy if exists pubph_ins on storage.objects;
drop policy if exists pubph_upd on storage.objects;
drop policy if exists pubph_del on storage.objects;
create policy pubph_ins on storage.objects for insert to authenticated with check (bucket_id = 'public-photos' and public.is_core_admin());
create policy pubph_upd on storage.objects for update to authenticated using (bucket_id = 'public-photos' and public.is_core_admin());
create policy pubph_del on storage.objects for delete to authenticated using (bucket_id = 'public-photos' and public.is_core_admin());

drop policy if exists sperm_w on public.staff_permissions;
create policy sperm_w on public.staff_permissions for all to authenticated
  using (public.is_core_admin() or (public.core_can('users:manage') and permission_code <> 'users:manage' and not public.is_protected_staff(staff_id)))
  with check (public.is_core_admin() or (public.core_can('users:manage') and permission_code <> 'users:manage' and not public.is_protected_staff(staff_id)));

delete from public.staff_permissions where permission_code = 'publish:manage';
delete from public.permissions where code = 'publish:manage';
