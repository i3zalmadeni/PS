/* الموقع العام: ترويسة موحّدة + عميل Supabase + دوال عرض مشتركة. كل البيانات من دوال قراءة عامة تعيد المشارَك فقط. */
const sb = supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }) : "—");
const initial = (n) => [...String(n).replace(/^(أ\.|د\.|الأستاذ|الأستاذة)\s*/, "")][0] || "؟";
const short = (n) => String(n).split(" ").filter((w) => w !== "بن").slice(0, 2).join(" ");
const L = {
  ach: { award: "جائزة", recognition: "تكريم", participation: "مشاركة", initiative: "مبادرة", project: "مشروع", knowledge_output: "إنتاج معرفي", educational_product: "منتج تعليمي", community_service: "خدمة مجتمعية", training_experience: "خبرة تدريبية", achievement: "إنجاز" },
  prog: { course: "دورة", workshop: "ورشة عمل", meeting: "لقاء", applied_lesson: "درس تطبيقي", exchange_visit: "زيارة تبادلية", expert_meeting: "لقاء خبراء", reading_session: "جلسة قراءة", specialized_program: "برنامج تخصصي", collective_learning: "تعلم جماعي" },
  goal: { in_progress: "قيد التنفيذ", awaiting_documentation: "بانتظار التوثيق", completed: "مكتمل", needs_review: "يحتاج مراجعة", postponed: "مؤجل", not_started: "لم يبدأ" },
  skillcat: { pedagogical: "تربوية", digital: "رقمية", specialized: "تخصصية", leadership: "قيادية", collaboration: "تعاون وتواصل", ai: "الذكاء الاصطناعي" },
  init: { planned: "مخطط", in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغى" },
  pstat: { completed: "منفّذ", open: "التسجيل مفتوح", planned: "قريبًا" },
};
const NAVP = [["index.html", "الرئيسية"], ["about.html", "عن المدرسة"], ["staff.html", "المعلمون"], ["practices.html", "الممارسات"], ["programs.html", "البرامج"]];
function pubHeader(active) {
  const links = NAVP.map(([h, t]) => `<a href="${h}" class="${h === active ? "on" : ""}">${t}</a>`).join("");
  return `<header><div class="wrap top">
  <a class="bm" href="index.html"><img src="assets/favicon.svg" width="40" height="40" alt=""><span><b>مجتمع المعلمين الذكي</b><small>متوسطة لبيد بن ربيعة</small></span></a>
  <button class="navtoggle" id="navToggle" type="button" aria-label="القائمة" aria-expanded="false" aria-controls="nav"><svg class="ico b" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="ico x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  <nav id="nav">${links}<a href="login.html" class="navbtn">دخول المعلمين</a></nav>
  <span class="moe"><b>وزارة التعليم</b><small>Ministry of Education</small></span></div></header>`;
}
function pubPage(active, render) {
  document.body.className = "pub site";
  document.body.insertAdjacentHTML("afterbegin", pubHeader(active) + '<main class="wrap" id="view"><div class="muted" style="padding:40px 0">جارٍ التحميل…</div></main>');
  const btn = document.getElementById("navToggle"), hd = btn.closest("header"), set = (o) => { hd.classList.toggle("open", o); btn.setAttribute("aria-expanded", o ? "true" : "false"); };
  btn.onclick = () => set(!hd.classList.contains("open")); document.getElementById("nav").onclick = (e) => { if (e.target.closest("a")) set(false); };
  const v = document.getElementById("view");
  Promise.resolve(render(v)).catch((e) => { console.error(e); v.innerHTML = '<div class="empty">تعذر تحميل البيانات الآن. حاول لاحقًا.</div>'; });
}
const rpc = async (n, a) => { const { data, error } = await sb.rpc(n, a); if (error) throw error; return data; };
const demoNote = '<div class="demo">بيانات تجريبية لعرض النظام، وستُستبدل بالبيانات الحقيقية.</div>';
