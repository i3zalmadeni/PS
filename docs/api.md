# واجهة النواة الرقمية (core-api)

العنوان: `https://kbhovmnvqzgihhyibqkq.supabase.co/functions/v1/core-api`

## مبادئ
- لكل نظام سجل في جدول `systems` ومفتاح خاص يُولَّد من «مركز الربط» ويظهر مرة واحدة. يُخزَّن هاش SHA-256 فقط.
- يُرسل المفتاح في الترويسة `x-system-key`. كل مسارات `/v1` للقراءة (GET).
- لكل نظام نطاقات (scopes): `staff:read`، `staff:contact`، `teams:read`، `identity:verify`.
- الأنظمة الأخرى تحتفظ بمعرّف المنسوب `staff.id` فقط، وتسترجع بياناته من النواة عند الحاجة، وتحتفظ ببياناتها التشغيلية عندها.
- الترقيم: `limit` (حتى 500) و`offset`.

## المسارات
| المسار | النطاق | الوصف |
|---|---|---|
| `GET /v1/staff?category=&active=all&limit=&offset=` | staff:read | قائمة المنسوبين مع بيانات التدريس |
| `GET /v1/staff/{id}` | staff:read | منسوب واحد؛ مع `contact` (الرقم الوظيفي والبريد والجوال) إن وُجد النطاق staff:contact |
| `GET /v1/staff/{id}/memberships` | teams:read | عضويات المنسوب في الفرق مع التواريخ |
| `GET /v1/teams?type=` | teams:read | الفرق واللجان |
| `GET /v1/teams/{id}/members?active=all` | teams:read | أعضاء الفريق |
| `GET /v1/identity/verify?user_id=` أو `?staff_id=` | identity:verify | صلاحية الحساب والأدوار وصلاحيات النظام المستدعي فقط |

الأخطاء: `401` مفتاح مفقود أو غير صالح أو النظام موقوف، `403` نطاق ناقص، `404` غير موجود.

## مسارات الإدارة (POST، بجلسة مدير النواة)
`/admin/create-account` و`/admin/set-status` و`/admin/reset-password`. تُستخدم من صفحة المنسوبين.

## إضافة نظام مدرسي جديد
1. سجّله من «مركز الربط» (معرّف واسم). تُنشأ له صلاحيات الاطلاع والإضافة والتعديل والاعتماد تلقائياً.
2. ولّد مفتاحه وحدد نطاقاته.
3. يخزّن النظام `staff.id` كمرجع، ولا ينشئ جدول معلمين خاصاً به.
