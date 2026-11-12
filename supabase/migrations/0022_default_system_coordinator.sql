-- المنسق الافتراضي لبطاقات الأنظمة: تكليف «منسق» العام في النواة (بلا نظام محدد) يُعاد بالمفتاح "_default"،
-- وتستخدمه الصفحة الرئيسية لأي نظام لم يُعيَّن له منسق خاص (مثل احجز مرفق) بدل «يُعلن قريباً».
-- قاعدة النشر كما هي: لا يُعرض إلا من فُعِّل نشره للعامة ما دام نشر المدرسة مفعّلاً.
create or replace function public.public_system_coordinators() returns jsonb
language sql stable security definer set search_path to 'public' as $f$
  select case when not coalesce((select publish_public from school_profile limit 1), false) then '{}'::jsonb
  else coalesce((
    select jsonb_object_agg(x.k, jsonb_build_object('name', x.n, 'photo', x.p))
    from (
      select distinct on (a.k) a.k, a.n, a.p from (
        select case when sr.role_code = 'core_admin' then 'core' else coalesce(sr.system_code, '_default') end as k,
               s.full_name as n, s.public_photo_path as p, sr.started_on
        from staff_roles sr join staff_members s on s.id = sr.staff_id
        where s.is_active and s.publish_public
          and (sr.ended_on is null or sr.ended_on > current_date)
          and (sr.role_code = 'coordinator'
            or (sr.role_code = 'core_admin' and sr.system_code is null))
      ) a
      order by a.k, a.started_on desc
    ) x
  ), '{}'::jsonb) end $f$;
grant execute on function public.public_system_coordinators() to anon, authenticated;
