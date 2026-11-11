# واجهة التكامل – core-api (الإصدار 2)

العنوان: `https://kbhovmnvqzgihhyibqkq.supabase.co/functions/v1/core-api`
المصادقة: ترويسة `x-system-key` بمفتاح النظام (يُنشأ من «إعدادات النواة والتكامل»، ويظهر مرة واحدة، ويُخزَّن مجزّأً SHA-256).
الواجهة **للقراءة فقط**: أي طريقة غير GET على `/v1/*` تُرفض (405). لا تُعاد بيانات التواصل (جوال، بريد، عنوان، أولياء أمور).

| النقطة | النطاق | الوصف |
|---|---|---|
| `GET /v1/school` | school:read | الملف، الأعوام، المراحل، الإحصاءات المحسوبة |
| `GET /v1/staff?category=&active=all&updated_since=&limit=&offset=` | staff:read | المنسوبون |
| `GET /v1/staff/{id}` | staff:read | منسوب بالمعرّف الثابت |
| `GET /v1/students?year=&grade=&updated_since=` | students:read | تسجيل المتعلمين في عام (الحالي افتراضياً) |
| `GET /v1/facilities?type=&updated_since=` | facilities:read | المرافق |
| `GET /v1/facilities/{id}` | facilities:read | مرفق مع تجهيزاته |
| `GET /v1/changes?after=&registry=&limit=` | changes:read | موجز التغييرات (معرّفات فقط) مقيّد بنطاقات النظام |
| `GET /v1/identity/verify?user_id=|staff_id=` | identity:verify | صلاحية الهوية وأدوار وصلاحيات النظام نفسه |

## إشعار التغيير
يستعلم النظام المستقل دورياً عن `/v1/changes?after=<آخر مؤشر>`؛ يعيد `{id, registry, entity_id, op, changed_at}` و`next_cursor`، ثم يجلب السجل المتغير بنطاقه. يُظهر كل حدث سجلات النطاقات الممنوحة فقط.

## الأمان والتسجيل
- مفتاح لكل نظام، ويُدوَّر من لوحة الإدارة فيُبطَل القديم فوراً.
- نطاق أدنى افتراضي لكل نظام؛ يُمنح الزائد يدوياً.
- كل طلب (ناجح أو مرفوض بعد المصادقة) يُسجَّل في `system_access_logs`.
- النظام الموقوف مرفوض (401). المعرّفات UUID ثابتة عبر الأعوام.
- مسارات `/admin/*` لمدير النواة أو لمن يملك الصلاحية الخاصة `users:manage` (إدارة المستخدمين الكاملة). حسابات من يحمل دور مدير النواة/المدرسة محمية: لا يعدّلها إلا مدير النواة (`403 admin_protected`).
- الدخول بمعرّف: `POST /admin/create-account` يقبل `login_id` (أرقام أو حروف إنجليزية صغيرة/كبيرة و`. _ -`، من 3 إلى 40 خانة) بدل البريد، فيُنشأ حساب Supabase Auth ببريد داخلي `<المعرّف>@id.invalid` ويُحفظ المعرّف في `staff_private.login_id` (فريد). تسجيل الدخول يحوّل المعرّف إلى هذا البريد تلقائياً، والحسابات القديمة بالبريد الحقيقي تعمل كما هي. أخطاء: `invalid_login_id`، `login_id_taken`. تغيير المعرّف لاحقاً: `POST /admin/set-login-id` بـ `{staff_id, login_id}`. تغيير البريد: `POST /admin/set-email` بـ `{staff_id, email}` (حساب يدخل بالبريد: يتغير بريد الدخول أيضاً؛ حساب يدخل بمعرّف: بريد تواصل فقط ويمكن تركه فارغاً). عند الإنشاء يمكن إرسال `contact_email` اختيارياً. الاسم وكلمة المرور والإيقاف: من نافذة «الحساب» (`/admin/reset-password` و`/admin/set-status`).

## الأخطاء
`401 missing_system_key | invalid_system_key`، `403 scope_required`، `404 not_found`، `405 read_only_api`، `400 bad_request`.
