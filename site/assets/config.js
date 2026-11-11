// مفتاح عام (publishable) آمن للمتصفح: الحماية الفعلية في سياسات RLS بقاعدة البيانات.
// لا تضع هنا مفتاح service_role أبدًا.
window.APP_CONFIG = {
  supabaseUrl: "https://kbhovmnvqzgihhyibqkq.supabase.co",
  supabaseKey: "sb_publishable_hfzNlh9tCpuC2zCf4T_2FA_42ujADOX",
};

// الدخول بمعرّف: يُترجم المعرّف داخلياً إلى بريد غير حقيقي بهذا النطاق (يطابق LOGIN_DOMAIN في دالة core-api).
window.LOGIN_DOMAIN = "id.invalid";

// منسقو الأنظمة المعروضون في بطاقات «الأنظمة» بالصفحة الرئيسية.
// اكتب الاسم كما هو في قائمة المنسوبين المنشورة تماماً ليظهر معه صورته تلقائياً.
window.SYSTEM_COORDINATORS = {
  core:      { role: "منسق النواة الرقمية", name: "" },
  saas:      { role: "منسق التقويم الذاتي", name: "" },
  community: { role: "منسق النمو المهني", name: "" },
  plans:     { role: "منسق الخطط الذكية", name: "" },
};
