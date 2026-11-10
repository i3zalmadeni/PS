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

const ICO = {
  dash: '<path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 5.5a3.2 3.2 0 010 6M18.5 14.4c1.9.8 3 2.6 3 5.6"/>',
  add: '<circle cx="10" cy="8" r="3.5"/><path d="M3 20c0-3.6 3-6 7-6M18 14v6M15 17h6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  grow: '<path d="M12 21V9M12 9c0-3 2-5 6-5 0 4-2 6-6 6M12 12c0-2.5-1.8-4.2-5-4.2 0 3.4 1.8 5 5 5"/>', star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z"/>',
  book: '<path d="M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2z"/><path d="M4 21h14"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
};
const ic = (k) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
/* الشريط الإضافي: أقسام لوحة التحكم بحسب الدور (مثل لوحة التقويم الذاتي الذكي) */
const SUB_ADMIN = [["dashboard.html", "لوحة المؤشرات", "dash"], ["admin-users.html", "المعلمون والحسابات", "add"], ["review.html", "الاعتمادات", "check", "pending"], ["plc.html", "مجتمعات التعلم", "users"], ["teachers.html", "دليل المعلمين", "users"], ["profile.html", "ملفي المهني", "user", "mine"], ["achievements.html", "إنجازاتي", "star", "mine"]];
const SUB_TEACHER = [["home.html", "الرئيسية", "home"], ["profile.html", "ملفي المهني", "user"], ["growth.html", "النمو المهني", "grow"], ["achievements.html", "الإنجازات والشواهد", "star"], ["plc.html", "مجتمعات التعلم", "users"], ["teachers.html", "المعلمون", "users"]];
const PUBNAV = [["index.html", "الرئيسية"], ["about.html", "عن المدرسة"], ["staff.html", "المعلمون"], ["practices.html", "الممارسات"], ["programs.html", "البرامج"]];

/** ترويسة الموقع الموحّدة (نفس هوية التقويم الذاتي الذكي): القائمة العلوية + الشريط الإضافي. */
function siteHeader(navHtml, sub) {
  return `<div class="astick"><header><div class="wrap top">
  <a class="bm" href="index.html"><img src="assets/favicon.svg" width="40" height="40" alt=""><span><b>مجتمع المعلمين الذكي</b><small>متوسطة لبيد بن ربيعة</small></span></a>
  <button class="navtoggle" id="navToggle" type="button" aria-label="القائمة" aria-expanded="false" aria-controls="nav"><svg class="ico b" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="ico x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  <nav id="nav">${navHtml}</nav>
  <span class="moe"><b>وزارة التعليم</b><small>Ministry of Education</small></span>
</div></header>${sub || ""}</div>`;
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
  const rev = isReviewer(me), home = rev ? "dashboard.html" : "home.html";
  const top = PUBNAV.map(([h, n]) => `<a href="${h}">${n}</a>`).join("") + `<a href="${home}" class="navbtn">لوحة التحكم</a>`;
  const items = (rev ? SUB_ADMIN : SUB_TEACHER).filter((n) => n[3] !== "mine" || me.teacherId);
  const sub = `<div id="subbar"><div class="wrap sb"><nav id="menu" aria-label="قائمة لوحة التحكم">${items.map((n) => `<a href="${n[0]}" class="${n[0] === page ? "on" : ""}" ${n[0] === page ? 'aria-current="page"' : ""}>${ic(n[2])}<span>${esc(n[1])}</span>${n[3] === "pending" ? '<span class="nb" id="pendNb" hidden></span>' : ""}</a>`).join("")}</nav>
    <span class="who" title="${esc(me.email)}">${esc(me.name)} • ${esc(ROLE_LABELS[me.role])}</span><button class="sbout" id="out" type="button">خروج</button></div></div>`;
  document.getElementById("shell").innerHTML = siteHeader(top, sub) + `<main class="wrap" id="main"></main>` + (window.labFooterHtml || "");
  wireNavToggle();
  document.getElementById("out").onclick = async () => { await sb.auth.signOut(); location.replace("login.html"); };
  if (rev) { // عدّاد الطلبات المعلقة على «الاعتمادات»
    Promise.all([["achievements", "status"], ["evidence_files", "status"], ["teaching_practices", "verification_status"], ["teacher_skills", "verification_status"], ["initiatives", "verification_status"], ["teacher_qualifications", "verification_status"]]
      .map(([tb, c]) => sb.from(tb).select("id", { count: "exact", head: true }).in(c, ["submitted", "under_review"]).then((r) => r.count || 0)))
      .then((a) => { const n = a.reduce((x, y) => x + y, 0), el = document.getElementById("pendNb"); if (el && n) { el.textContent = n; el.hidden = false; } }).catch(() => {});
  }
  const main = document.getElementById("main");
  try { await render(me, main); } catch (e) { console.error(e); main.innerHTML = `<p class="err">تعذر تحميل الصفحة.</p>`; }
}
const header = (t, s) => `<h2 class="title">${esc(t)}</h2>${s ? `<p class="sub">${esc(s)}</p>` : ""}`;

/** صفحة الوصول بعد الدخول بحسب الدور: لوحة التحكم للمدير والإدارة، والرئيسية للمعلم. */
async function landing() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return "login.html";
  const { data: r } = await sb.from("users").select("role").eq("id", session.user.id).maybeSingle();
  return ["system_admin", "principal", "coordinator"].includes(r?.role) ? "dashboard.html" : "home.html";
}
