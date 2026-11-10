# إعادة بناء النواة الرقمية (2026-11-10)

بطلب المالك حُذف النظام السابق (جداول public والموقع) وبدأ المشروع من جديد على المشروع نفسه (Supabase `labeedsch_PC`، GitHub Pages).

- الهجرات المطبّقة في سجل Supabase: `0007_reset_public_schema`، `0008_core_foundation`.
- حسابات `auth.users` بقيت. حساب المالك مرتبط بسجل منسوب بدور `core_admin`.
- الجداول: staff_members, staff_categories, job_titles, staff_teaching, staff_position_history, roles, permissions, staff_roles, staff_permissions, systems, team_types, teams, team_memberships, audit_logs.
- الصفحات: تسجيل الدخول، لوحة النواة، المنسوبون، الفرق واللجان (قراءة فقط حالياً).
- التالي: إضافة/استيراد المنسوبين، إدارة الفرق والعضويات، الملف المهني، مركز الربط وواجهات API.
