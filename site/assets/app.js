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
  ["home.html", "الرئيسية"], ["teachers.html", "المعلمون"], ["profile.html", "ملفي المهني"],
  ["growth.html", "النمو المهني"], ["achievements.html", "الإنجازات والشواهد"],
  ["review.html", "مراجعة الاعتمادات", "reviewer"],
  ["admin-users.html", "إدارة المعلمين", "reviewer"],
];

/** ترويسة الموقع الموحّدة (نفس هوية التقويم الذاتي الذكي). */
function siteHeader(navHtml) {
  return `<header><div class="wrap top">
  <a class="bm" href="index.html"><img src="assets/favicon.svg" width="40" height="40" alt=""><span><b>مجتمع المعلمين الذكي</b><small>متوسطة لبيد بن ربيعة</small></span></a>
  <button class="navtoggle" id="navToggle" type="button" aria-label="القائمة" aria-expanded="false" aria-controls="nav"><svg class="ico b" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="ico x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  <nav id="nav">${navHtml}</nav>
  <span class="moe"><b>وزارة التعليم</b><small>Ministry of Education</small></span>
</div></header>`;
}
function wireNavToggle() {
  const btn = document.getElementById("navToggle"), nav = document.getElementById("nav"); if (!btn || !nav) return;
  const hd = btn.closest("header"), set = (on) => { hd.classList.toggle("open", on); btn.setAttribute("aria-expanded", on ? "true" : "false"); };
  btn.addEventListener("click", () => set(!hd.classList.contains("open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  document.addEventListener("click", (e) => { if (!hd.contains(e.target)) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
}

/** يحمّل المستخدم الحالي أو يحوّل إلى الدخول، ثم يرسم الهيكل وينفذ الصفحة. */
async function boot(page, render) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace("login.html"); return; }
  const { data: row } = await sb.from("users").select("id,email,role,status").eq("id", session.user.id).maybeSingle();
  if (!row || row.status !== "active") { await sb.auth.signOut(); location.replace("login.html?e=inactive"); return; }
  const { data: t } = await sb.from("teachers").select("id,full_name").eq("user_id", row.id).maybeSingle();
  const me = { id: row.id, email: row.email, role: row.role, teacherId: t?.id ?? null, name: t?.full_name ?? row.email };
  const links = NAV.filter((n) => n[2] !== "reviewer" || isReviewer(me))
    .map((n) => `<a href="${n[0]}" class="${n[0] === page ? "on" : ""}">${esc(n[1])}</a>`).join("");
  document.getElementById("shell").innerHTML = siteHeader(links + `<a href="#" id="out" class="navbtn" title="${esc(me.name)} – ${esc(ROLE_LABELS[me.role])}">خروج</a>`)
    + `<main class="wrap" id="main"></main>` + (window.labFooterHtml || "");
  wireNavToggle();
  document.getElementById("out").onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.replace("login.html"); };
  const main = document.getElementById("main");
  main.insertAdjacentHTML("beforebegin", "");
  try { await render(me, main); } catch (e) { console.error(e); main.innerHTML = `<p class="err">تعذر تحميل الصفحة.</p>`; }
}
const header = (t, s) => `<h2 class="title">${esc(t)}</h2>${s ? `<p class="sub">${esc(s)}</p>` : ""}`;
