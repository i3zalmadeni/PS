const sb = supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);
const FN = APP_CONFIG.supabaseUrl + "/functions/v1/core-api";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const qs = (k) => new URLSearchParams(location.search).get(k);
const fmt = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "short", day: "numeric" }) : "—");
const L = {
  acct: { none: "بلا حساب", invited: "مدعو", active: "نشط", suspended: "موقوف" },
  verif: { draft: "مسودة", submitted: "مقدَّم", under_review: "قيد المراجعة", approved: "معتمد", needs_revision: "يحتاج إلى استكمال", rejected: "مرفوض" },
  member: { leader: "قائد", deputy: "نائب", member: "عضو" },
  tstatus: { active: "نشط", paused: "متوقف مؤقتاً", closed: "منتهٍ" },
  section: { qualification: "المؤهلات", experience: "الخبرات", skill: "المهارات", certificate: "الشهادات", achievement: "الإنجازات", participation: "المشاركات", membership: "العضويات", responsibility: "المسؤوليات", evidence: "الشواهد والمرفقات" },
  domain: { teaching_practice: "الممارسات التعليمية والمهنية", professional_growth: "النمو المهني", plc: "مجتمعات التعلم المهنية", achievement: "الأداء والإنجاز المهني" },
  rkind: { functional: "وظيفي", organizational: "تنظيمي", technical: "تقني" },
  level: { view: "اطلاع", add: "إضافة", edit: "تعديل", approve: "اعتماد" },
};
const vbadge = (s) => `<span class="badge ${s === "approved" ? "ok" : s === "rejected" ? "bad" : s === "needs_revision" ? "warn" : ""}">${esc(L.verif[s] || s)}</span>`;
const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}" ${k === sel ? "selected" : ""}>${esc(v)}</option>`).join("");
const head = (t, s) => `<h2>${esc(t)}</h2>${s ? `<p class="sub">${esc(s)}</p>` : ""}`;
const today = () => new Date().toISOString().slice(0, 10);
const nn = (v) => (v === "" || v === undefined ? null : v);

function toast(msg, bad) { const d = document.createElement("div"); d.className = "toast" + (bad ? " bad" : ""); d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 3500); }
function modal(html) {
  const ov = document.createElement("div"); ov.className = "ov"; ov.innerHTML = `<div class="md" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => ov.remove(); ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
  document.body.appendChild(ov); return { el: ov.firstChild, close };
}
function mapErr(e) {
  const m = e?.message || String(e);
  if (/team_one_leader/.test(m)) return "للفريق قائد نشط بالفعل. أنهِ عضويته أولاً.";
  if (/team_one_deputy/.test(m)) return "للفريق نائب نشط بالفعل. أنهِ عضويته أولاً.";
  if (/team_active_member/.test(m)) return "المنسوب عضو نشط في هذا الفريق بالفعل.";
  if (/staff_private_email|staff_private_employee/.test(m)) return "البريد أو الرقم الوظيفي مستخدم لمنسوب آخر.";
  if (/row-level security/.test(m)) return "لا تملك صلاحية تنفيذ هذه العملية.";
  return m;
}
async function api(path, body) {
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch(FN + path, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + session.access_token, apikey: APP_CONFIG.supabaseKey }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(({ account_exists: "للمنسوب حساب بالفعل", password_too_short: "كلمة المرور أقصر من 10 أحرف", invalid_email: "بريد غير صالح", forbidden: "غير مصرح" })[j.error] || j.error || "فشل الطلب"); return j;
}

const NAV = [["dashboard.html", "لوحة النواة"], ["staff.html", "المنسوبون"], ["teams.html", "الفرق واللجان"], ["profile.html", "ملفي"],
  ["import.html", "الاستيراد", 1], ["access.html", "الصلاحيات", 1], ["integrations.html", "مركز الربط", 1], ["audit.html", "سجل التدقيق", 1]];
async function boot(page, render, o = {}) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace("login.html"); return; }
  const { data: me } = await sb.from("staff_members").select("id,full_name,category,job_title").eq("user_id", session.user.id).maybeSingle();
  if (!me) { await sb.auth.signOut(); location.replace("login.html?e=nostaff"); return; }
  const { data: adm } = await sb.rpc("is_core_admin"); const isAdmin = adm === true;
  if (o.admin && !isAdmin) { location.replace("dashboard.html"); return; }
  const ctx = { me, isAdmin, uid: session.user.id };
  document.getElementById("shell").innerHTML =
    `<header><div class="wrap top"><div class="brand"><b>النواة الرقمية</b><small>متوسطة لبيد بن ربيعة</small></div>
     <nav>${NAV.filter((n) => !n[2] || isAdmin).map(([h, n]) => `<a href="${h}" class="${h === page ? "on" : ""}">${n}</a>`).join("")}<a href="#" id="out">خروج</a></nav></div></header><main class="wrap" id="main"></main>`;
  document.getElementById("out").onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.replace("login.html"); };
  const main = document.getElementById("main");
  try { await render(main, ctx); } catch (e) { console.error(e); main.innerHTML = '<p class="err">تعذر تحميل الصفحة.</p>'; }
}
