/* مجتمع المعلمين الذكي – واجهة ثابتة تتصل بـ Supabase مباشرة. الصلاحيات تُفرض في RLS. */
const sb = supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);

const ROLE_LABELS = { system_admin: "مدير النظام", principal: "مدير المدرسة", coordinator: "منسق النمو المهني", teacher: "معلم" };
const STATUS_LABELS = { draft: "مسودة", submitted: "مقدَّم", under_review: "قيد المراجعة", approved: "معتمد", needs_revision: "يحتاج إلى استكمال", rejected: "مرفوض" };
const STATUS_CLASS = { approved: "ok", needs_revision: "warn", rejected: "bad" };
const GOAL_LABELS = { not_started: "لم يبدأ", in_progress: "قيد التنفيذ", awaiting_documentation: "بانتظار التوثيق", completed: "مكتمل", needs_review: "يحتاج إلى مراجعة", postponed: "مؤجل" };
const ACH_TYPES = { award: "جائزة", recognition: "تكريم / شهادة تقدير", participation: "مشاركة متميزة", initiative: "مبادرة", project: "مشروع", knowledge_output: "إنتاج معرفي", educational_product: "منتج تعليمي", community_service: "مشاركة مجتمعية", training_experience: "خبرة تدريبية", achievement: "إنجاز" };
const MIME = { "application/pdf": 1, "image/jpeg": 1, "image/png": 1, "image/webp": 1,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 1,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": 1,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 1 };
const EXT = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx" };

/** تهريب HTML: كل نص قادم من القاعدة يمر من هنا قبل إدراجه. */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }) : "—");
const badge = (st) => `<span class="badge ${STATUS_CLASS[st] || ""}">${esc(STATUS_LABELS[st] || st)}</span>`;
const isReviewer = (u) => ["system_admin", "principal", "coordinator"].includes(u.role);

const NAV = [
  ["index.html", "الرئيسية"], ["teachers.html", "المعلمون"], ["profile.html", "ملفي المهني"],
  ["growth.html", "النمو المهني"], ["achievements.html", "الإنجازات والشواهد"],
  ["review.html", "مراجعة الاعتمادات", "reviewer"],
  ["#", "الممارسات • المجتمع • البرامج • مجتمعات التعلم • المبادرات • التحليلات (قريبًا)", "soon"],
];

/** يحمّل المستخدم الحالي أو يحوّل إلى الدخول، ثم يرسم الهيكل وينفذ الصفحة. */
async function boot(page, render) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace("login.html"); return; }
  const { data: row } = await sb.from("users").select("id,email,role,status").eq("id", session.user.id).maybeSingle();
  if (!row || row.status !== "active") { await sb.auth.signOut(); location.replace("login.html?e=inactive"); return; }
  const { data: t } = await sb.from("teachers").select("id,full_name").eq("user_id", row.id).maybeSingle();
  const me = { id: row.id, email: row.email, role: row.role, teacherId: t?.id ?? null, name: t?.full_name ?? row.email };
  const links = NAV.filter((n) => n[2] !== "reviewer" || isReviewer(me))
    .map((n) => `<a href="${n[0]}" class="${n[2] === "soon" ? "soon" : ""} ${n[0] === page ? "on" : ""}">${esc(n[1])}</a>`).join("");
  document.getElementById("shell").innerHTML = `<div class="wrap"><aside><h1>مجتمع المعلمين الذكي</h1>${links}
    <hr style="border:0;border-top:1px solid var(--b100);margin:14px 0"><div class="muted">${esc(me.name)}<br>${esc(ROLE_LABELS[me.role])}</div>
    <a href="#" id="out">تسجيل الخروج</a></aside><main id="main"></main></div>`;
  document.getElementById("out").onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.replace("login.html"); };
  const main = document.getElementById("main");
  try { await render(me, main); } catch (e) { console.error(e); main.innerHTML = `<p class="err">تعذر تحميل الصفحة.</p>`; }
}
const header = (t, s) => `<h2 class="title">${esc(t)}</h2>${s ? `<p class="sub">${esc(s)}</p>` : ""}`;
