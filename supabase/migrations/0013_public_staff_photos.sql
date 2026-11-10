-- صور المنسوبين المنشورين: مخزن عام منفصل، لا تُنسخ إليه إلا صور من فعّلت الإدارة نشرهم
alter table public.staff_members add column if not exists public_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-photos', 'public-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists pubph_ins on storage.objects;
drop policy if exists pubph_upd on storage.objects;
drop policy if exists pubph_del on storage.objects;
create policy pubph_ins on storage.objects for insert to authenticated with check (bucket_id = 'public-photos' and public.core_can('personnel:edit'));
create policy pubph_upd on storage.objects for update to authenticated using (bucket_id = 'public-photos' and public.core_can('personnel:edit'));
create policy pubph_del on storage.objects for delete to authenticated using (bucket_id = 'public-photos' and public.core_can('personnel:edit'));

create or replace function public.public_staff() returns jsonb language sql stable security definer set search_path to 'public' as $f$
 select case when not coalesce((select publish_public from school_profile limit 1),false) then jsonb_build_object('published',false)
 else jsonb_build_object('published',true,'staff',coalesce((
   select jsonb_agg(jsonb_build_object('name',s.full_name,'category',s.category,'job_title',j.name_ar,'specialty',s.specialty,'department',s.department,'photo',s.public_photo_path,'leader',s.job_title in ('principal','deputy')) order by case when s.job_title='principal' then 0 when s.job_title='deputy' then 1 else 2 end, c.sort_order, s.full_name)
   from staff_members s join staff_categories c on c.code=s.category left join job_titles j on j.code=s.job_title and j.category=s.category
   where s.is_active and s.publish_public),'[]'::jsonb),'generated_at',now()) end $f$;
grant execute on function public.public_staff() to anon, authenticated;
