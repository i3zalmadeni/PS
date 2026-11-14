// مفتاح عام (publishable) آمن للمتصفح: الحماية الفعلية في سياسات RLS بقاعدة البيانات.
// لا تضع هنا مفتاح service_role أبدًا.
window.APP_CONFIG = {
  supabaseUrl: "https://kbhovmnvqzgihhyibqkq.supabase.co",
  supabaseKey: "sb_publishable_hfzNlh9tCpuC2zCf4T_2FA_42ujADOX",
};

// الدخول بمعرّف: يُترجم المعرّف داخلياً إلى بريد غير حقيقي بهذا النطاق (يطابق LOGIN_DOMAIN في دالة core-api).
window.LOGIN_DOMAIN = "id.invalid";

// مسميات أدوار المنسقين في بطاقات «بواباتنا الرقمية» بالصفحة الرئيسية.
// الأسماء والصور تُقرأ تلقائياً من التكليفات في منصة النواة (دالة public_system_coordinators)، ولا تُكتب هنا.
// النظام الذي لم يُعيَّن له منسق خاص يعرض افتراضياً المنسق العام المعيَّن في النواة.
window.SYSTEM_COORDINATORS = {
  core:      { role: "منسق النواة الرقمية", name: "" },
  saas:      { role: "منسق التقويم المدرسي", name: "" },
  community: { role: "منسق المجتمع المهني", name: "" },
  plans:     { role: "منسق الخطط الذكية", name: "" },
  booking:   { role: "منسق احجز مرفق", name: "" },
  qiyami:    { role: "منسق قيمي", name: "" },
  indibati:  { role: "منسق انضباطي", name: "" },
  mirat:     { role: "منسق مرآة", name: "" },
};

// بريد استقبال اقتراحات الأنظمة والأفكار (نموذج «اقترح نظاماً أو فكرة»). إن تُرك فارغاً يُستخدم بريد المدرسة المنشور.
window.SUGGEST_EMAIL = "";

// رابط العرض التعريفي «مدرسة البيانات الذكية» في قسم «كيف بُنيت بواباتنا الرقمية؟» بالرئيسية. يُخفى الزر إن تُرك فارغاً.
window.INTRO_URL = "https://claude.ai/artifact/2eoP5asqLPsUH6LzqkvmL2";
