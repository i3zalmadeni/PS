// بيانات الموقع العام: دالة عامة واحدة تُرجع الملخص القابل للنشر فقط (بلا أي بيانات شخصية)
const PUBX = { teaching: "الهيئة التعليمية", administrative: "الهيئة الإدارية", support: "الهيئة المساندة" };
const FSTAT = { operational: ["يعمل", "ok"], limited: ["جزئي", "warn"], closed: ["مغلق", "bad"] };
const GEN = { boys: "بنين", girls: "بنات", mixed: "مختلط" };
const pesc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pdate = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }) : "—");
let _ov;
function loadOverview() {
  return (_ov ||= fetch(APP_CONFIG.supabaseUrl + "/rest/v1/rpc/public_overview", { method: "POST", headers: { apikey: APP_CONFIG.supabaseKey, "content-type": "application/json" }, body: "{}" })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null));
}
function animateTo(el, to) { const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches, t0 = performance.now(); if (reduce) { el.textContent = to; return; } const f = (t) => { const k = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
const bars = (rows) => { const mx = Math.max(1, ...rows.map((r) => r[1])); return rows.map(([n, v]) => `<div class="row3"><span>${pesc(n)}</span><b>${v}</b><div class="track"><i style="width:${Math.round((v / mx) * 100)}%"></i></div></div>`).join("") || '<p class="sub">لا توجد بيانات منشورة بعد.</p>'; };

function fillLive(o) {
  document.querySelectorAll("[data-live]").forEach((e) => { const v = o?.published ? o.totals?.[e.dataset.live] : null; v == null ? (e.textContent = "—") : animateTo(e, v); });
  document.querySelectorAll("[data-live-text]").forEach((e) => { const k = e.dataset.liveText; const v = k === "year" ? o?.year?.name : o?.school?.[k]; e.textContent = v || ""; if (!v && e.dataset.hideEmpty) e.hidden = true; });
  const g = document.getElementById("live-grades"); if (g) g.innerHTML = o?.published ? bars((o.grades || []).map((x) => [`${x.name} · ${x.classes} فصول`, x.students])) : "";
}

async function renderData() {
  const root = document.getElementById("data-root"); const o = await loadOverview();
  if (!o || !o.published) { root.innerHTML = '<div class="card empty"><div class="big">🔒</div><h3>البيانات العامة غير منشورة حالياً</h3><p class="sub">تُظهر هذه الصفحة ملخصاً إحصائياً حين تفعّله إدارة المدرسة.</p></div>'; return; }
  const s = o.school || {}, t = o.totals || {}, loc = [s.region, s.city, s.district].filter(Boolean).join("، ");
  const kp = (e, v, n, k) => `<div class="kpi k${k}"><div class="ic em2">${e}</div><div><b data-live="${v}">0</b><span>${n}</span></div></div>`;
  const types = [...new Map((o.facilities || []).map((f) => [f.type, f.type_name || f.type])).entries()];
  root.innerHTML = `<div class="card pubcard rv"><div class="row2"><div><h2>${pesc(s.name)}</h2><p class="sub">${[s.stage, s.type, GEN[s.gender]].filter(Boolean).map(pesc).join(" · ")}</p></div>${o.year ? `<span class="yr2"><i></i>العام الدراسي ${pesc(o.year.name)}</span>` : ""}</div>
      <div class="fg mt">${[["📍 الموقع", loc], ["📞 الهاتف", s.phone], ["✉️ البريد", s.email], ["🌐 الموقع الإلكتروني", s.website]].filter((x) => x[1]).map(([k, v]) => `<div><small class="sub">${k}</small><br><b dir="auto">${pesc(v)}</b></div>`).join("") || '<p class="sub">لم تُنشر بيانات التواصل.</p>'}</div></div>
    <div class="kstrip2 mt">${kp("👥", "personnel", "منسوبو المدرسة", 0)}${kp("🎓", "students", "المتعلمون", 1)}${kp("🧩", "classes", "الفصول الدراسية", 2)}${kp("🏢", "facilities", "المرافق", 3)}</div>
    <div class="grid mt2"><div class="card brk rv"><b>🎓 المتعلمون والفصول حسب المرحلة</b>${bars((o.grades || []).map((x) => [`${x.name} · ${x.classes} فصول`, x.students]))}</div>
      <div class="card brk rv"><b>👥 المنسوبون حسب الفئة</b>${bars(Object.entries(o.personnel || {}).map(([k, v]) => [PUBX[k] || k, v]))}</div></div>
    <h3 class="sec rv">🏢 المرافق</h3><div class="bar rv"><input id="fq" placeholder="ابحث باسم المرفق أو المبنى"><select id="ft"><option value="">كل الأنواع</option>${types.map(([k, n]) => `<option value="${pesc(k)}">${pesc(n)}</option>`).join("")}</select></div>
    <div class="grid" id="fgrid"></div><p class="sub mt">آخر تحديث للبيانات: ${pdate(o.generated_at)}. تعرض الصفحة معلومات عامة وإحصائية فقط، ولا تتضمن أي بيانات شخصية للمنسوبين أو المتعلمين.</p>`;
  const draw = () => { const q = document.getElementById("fq").value.trim(), ty = document.getElementById("ft").value;
    document.getElementById("fgrid").innerHTML = (o.facilities || []).filter((f) => (!q || f.name.includes(q) || (f.building || "").includes(q)) && (!ty || f.type === ty)).map((f) => { const st = FSTAT[f.status] || ["", ""]; return `<div class="card feat fac"><div class="row2"><b>${pesc(f.name)}</b><span class="badge ${st[1]}">${st[0]}</span></div><small class="sub">${pesc(f.type_name || "")}</small><div class="meta">${f.building ? `<span>🏛️ ${pesc(f.building)}</span>` : ""}${f.floor ? `<span>⬆️ دور ${pesc(f.floor)}</span>` : ""}${f.capacity ? `<span>👤 ${f.capacity}</span>` : ""}</div></div>`; }).join("") || '<p class="sub">لا توجد مرافق مطابقة.</p>'; };
  document.getElementById("fq").oninput = draw; document.getElementById("ft").oninput = draw; draw();
  root.querySelectorAll("[data-live]").forEach((e) => animateTo(e, t[e.dataset.live] ?? 0));
  pubReveal();
}
function pubReveal() { const els = document.querySelectorAll(".rv:not(.in)"); if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; } const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.1 }); els.forEach((e) => io.observe(e)); }
