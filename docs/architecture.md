# معمارية النواة الرقمية – متوسطة لبيد بن ربيعة

نظام بيانات مركزي بأربعة سجلات فقط، تقرأ منه الأنظمة المستقلة ولا تكتب فيه.

## السجلات
| السجل | الجداول |
|---|---|
| المدرسة | school_profile، school_leadership، academic_years، grade_levels، class_sections، school_year_stats |
| المنسوبون | staff_members، staff_private، staff_categories، job_titles، staff_year_records |
| المتعلمون | students، student_private، student_enrollments، guardians، student_guardians، view students_current |
| المرافق | facility_types، facilities، facility_equipment |

جداول مساندة: roles، permissions، staff_roles، staff_permissions، systems، change_events، system_access_logs، audit_logs، import_jobs.

## دورة العام الدراسي
العام هو وحدة الدورة. للمتعلم والمنسوب والمرفق هوية UUID ثابتة؛ والتسجيل والفصول وكشف المنسوبين مرتبطة بالعام. `rollover_academic_year` تُنفَّذ ذرّياً: تحفظ ملخص العام، تنشئ العام الجديد، تنسخ الفصول، ترقّي المتعلمين وتخرّج الصف الأخير، ثم تُغلق العام القديم دون حذف شيء. العام المغلق مجمّد (`guard_closed_year`) إلا لمدير النواة.

## الأعداد المحسوبة
`school_stats()` تحسب المنسوبين حسب الفئة، والمتعلمين والفصول حسب المرحلة (من العام الحالي)، والمرافق حسب النوع، والطاقة الاستيعابية (المعلنة وإلا مجموع سعات الفصول). لا أرقام تُدخل يدوياً للعام الحالي.

## الصلاحيات
`core_can('<سجل>:<view|add|edit>')` بتدرّج (edit ⊃ add ⊃ view)، وRLS على كل جدول، وفصل بيانات التواصل (`personnel_contact:view`, `students_contact:view`). مدير النواة (core_admin/principal) يملك الكل. الصور في حاوية خاصة `registry-media`.

## الواجهة (site/)
dashboard، school، staff، students، facilities، access، settings (7 عناصر قائمة). المنطق المشترك في `assets/core.js`، وكل صفحة في `assets/p-*.js`.

## الواجهة البرمجية
`supabase/functions/core-api/index.ts` – انظر docs/api.md.

## الموقع العام وبيانات النشر
صفحات `index` و`about` و`data` عامة. تقرأ `data.html` والرئيسية دالة واحدة `public_overview()` (SECURITY DEFINER، متاحة لـ anon) تُرجع ملخصاً قابلاً للنشر فقط: بيانات المدرسة العامة، أعداد المنسوبين والمتعلمين والفصول، التوزيع حسب المرحلة والفئة، وقائمة المرافق (الاسم والنوع والمبنى والسعة والحالة). لا تُنشر أسماء ولا بيانات تواصل ولا بيانات متعلمين. يتحكم مدير النواة بالنشر من سجل المدرسة (الخانة «نشر ملخص المدرسة على الموقع العام» ← عمود `school_profile.publish_public`).

صفحة «منسوبو المدرسة» (`people.html`) تقرأ الدالة `public_staff()`: الاسم والوظيفة والتخصص والقسم فقط، ولمن فُعّل له `staff_members.publish_public` (الخانة في نموذج المنسوب، بموافقته). الافتراضي غير منشور، ولا تُنشر بيانات تواصل أو معرّفات. يخضع النشر أيضاً للمفتاح العام لسجل المدرسة.
