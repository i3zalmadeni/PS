# التقرير النهائي لإعادة الهيكلة

## نسخة الأمان
مخطط `backup_20261110` في قاعدة البيانات (الجداول + `_catalog`)، وفرع git `backup/pre-core-restructure-20261110`.

## ما أُبقي
جداول السجلات الأربعة ومساندها (انظر architecture.md)، وصفحات: dashboard, school, staff, students, facilities, access, settings, login, index.

## ما أُزيل وسببه
- جداول: teams، team_types، team_memberships، professional_records، staff_profile_items، staff_profiles، staff_teaching، وأعمدة team_id – وحدات تشغيلية تخص أنظمة مستقلة (المجتمعات والنمو المهني).
- صفحات: team، teams، profile، integrations، audit، import (اندمجت في settings وصفحات السجلات).
- دوال: guard_profile_item، guard_teaching_practice.
بياناتها محفوظة في نسخة الأمان، ولم يُحذف مصدر مجهول.

## يتطلب إجراءً يدوياً
1. حذف الحاويات السبع الفارغة القديمة من Storage (لا يمكن عبر SQL).
2. حذف دالتَي الحافة القديمتين `admin-users` و`admin-teacher-edit` من لوحة Supabase.
3. تفعيل «Leaked password protection» في إعدادات Auth.
4. إنشاء العام الدراسي الأول من سجل المدرسة (لم يُدخَل اسمه وتواريخه).
