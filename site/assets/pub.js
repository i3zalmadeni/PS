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

const TONES = [0, 1, 2, 3, 4, 5];
function fillLive(o) {
  document.querySelectorAll("[data-live]").forEach((e) => { const v = o?.published ? o.totals?.[e.dataset.live] : null; v == null ? (e.textContent = "—") : animateTo(e, v); });
  document.querySelectorAll("[data-live-text]").forEach((e) => { const k = e.dataset.liveText; const v = k === "year" ? o?.year?.name : o?.school?.[k]; e.textContent = v ? " · " + v : ""; if (!v && e.dataset.hideEmpty) e.hidden = true; });
  const t = o?.totals, ring = document.getElementById("gring");
  if (ring && t?.capacity) { const p = Math.min(100, Math.round((t.students / t.capacity) * 100)); ring.style.setProperty("--p", p); document.getElementById("gpct").textContent = p + "%"; document.getElementById("gsub").textContent = `${t.students} متعلماً من ${t.capacity} مقعداً`; }
  const g = document.getElementById("live-grades");
  if (g) g.innerHTML = o?.published ? (o.grades || []).map((x, n) => { const p = x.capacity ? Math.min(100, Math.round((x.students / x.capacity) * 100)) : 0; return `<div class="tcard t${TONES[n % 6]} rv"><div class="th"><div class="ti">${ico("cap")}</div><span class="tn">${p}%</span></div><h3>${pesc(x.name)}</h3><p class="tm">${x.students} متعلماً · ${x.classes} فصول${x.capacity ? ` · سعة ${x.capacity}` : ""}</p><div class="tbar"><i style="width:${p}%"></i></div></div>`; }).join("") : "";
  pubReveal();
}

function sortable(tbl) {
  const ths = tbl.querySelectorAll("th.srt"), tb = tbl.tBodies[0];
  ths.forEach((th) => (th.onclick = () => { const c = th.cellIndex, asc = !th.classList.contains("asc"); ths.forEach((x) => x.classList.remove("asc", "desc")); th.classList.add(asc ? "asc" : "desc");
    const val = (r) => { const t = r.cells[c]; return t.dataset.v ?? t.textContent.trim(); };
    [...tb.rows].sort((a, b) => { const x = val(a), y = val(b), nx = parseFloat(x), ny = parseFloat(y); const d = !isNaN(nx) && !isNaN(ny) ? nx - ny : String(x).localeCompare(String(y), "ar"); return asc ? d : -d; }).forEach((r) => tb.appendChild(r));
    [...tb.rows].forEach((r, n) => { const f = r.querySelector(".idx"); if (f) f.textContent = n + 1; }); }));
}
function tocBind(root) {
  const links = [...root.querySelectorAll(".toc a")], secs = links.map((a) => document.getElementById(a.getAttribute("href").slice(1)));
  const on = () => { let cur = 0; secs.forEach((s, n) => { if (s && s.getBoundingClientRect().top < 140) cur = n; }); links.forEach((a, n) => a.classList.toggle("on", n === cur)); };
  addEventListener("scroll", on, { passive: true }); on();
}
const toc = (l) => `<nav class="toc"><b>فهرس المستودع</b>${l.map(([id, i, t]) => `<a href="#${id}">${ico(i)}${t}</a>`).join("")}</nav>`;
const rsec = (id, i, t, small, body) => `<section class="rsec" id="${id}"><div class="rh">${ico(i)}<h2>${t}</h2><small>${small || ""}</small></div><div class="rb">${body}</div></section>`;
const kv = (rows) => `<dl class="kv">${rows.map(([i, k, v]) => `<dt>${ico(i)}${k}</dt><dd dir="auto">${v}</dd>`).join("")}</dl>`;
const csvDown = (name, head, rows) => { const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`; const b = new Blob(["\ufeff" + [head, ...rows].map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); };

async function renderData() {
  const root = document.getElementById("data-root"); const o = await loadOverview();
  if (!o || !o.published) { root.innerHTML = `<div class="repo"><div class="rsec" style="grid-column:1/-1"><div class="pn"><b>البيانات العامة غير منشورة حالياً</b><p>تُظهر هذه الصفحة سجل المدرسة حين تفعّله الإدارة.</p></div></div></div>`; return; }
  const s = o.school || {}, t = o.totals || {}, F = o.facilities || [], loc = [s.region, s.city, s.district].filter(Boolean).join("، ");
  const g = o.grades || [], tone = { operational: "c4", limited: "c3", closed: "c5" };
  const info = kv([["school", "اسم المدرسة", pesc(s.name)], ["info", "المرحلة", pesc(s.stage || "—")], ["info", "النوع", pesc(s.type || "—")], ["users", "الفئة", pesc(GEN[s.gender] || "—")], ["hourglass", "العام الدراسي الحالي", pesc(o.year?.name || "—")], ["pin", "الموقع", pesc(loc || "—")], ["phone", "الهاتف", pesc(s.phone || "—")], ["mail", "البريد الإلكتروني", pesc(s.email || "—")], ["globe", "الموقع الإلكتروني", pesc(s.website || "—")]]);
  const gt = g.reduce((a, x) => ({ c: a.c + x.classes, s: a.s + x.students, k: a.k + (x.capacity || 0) }), { c: 0, s: 0, k: 0 });
  const gTbl = `<div class="twrap"><table class="dt"><thead><tr><th>المرحلة الدراسية</th><th>الفصول</th><th>المتعلمون</th><th>السعة</th><th>الإشغال</th></tr></thead><tbody>${g.map((x) => { const p = x.capacity ? Math.min(100, Math.round((x.students / x.capacity) * 100)) : 0; return `<tr><td><b>${pesc(x.name)}</b></td><td class="n">${x.classes}</td><td class="n">${x.students}</td><td class="n">${x.capacity || "—"}</td><td><div class="occ"><i><b style="width:${p}%"></b></i><span class="n">${p}%</span></div></td></tr>`; }).join("")}</tbody><tfoot><tr><td>الإجمالي</td><td>${gt.c}</td><td>${gt.s}</td><td>${gt.k || "—"}</td><td>${gt.k ? Math.round((gt.s / gt.k) * 100) + "%" : "—"}</td></tr></tfoot></table></div>`;
  const tp = t.personnel || 1;
  const pTbl = `<div class="twrap"><table class="dt"><thead><tr><th>الفئة</th><th>العدد</th><th>النسبة من الإجمالي</th></tr></thead><tbody>${Object.entries(o.personnel || {}).map(([k, v]) => `<tr><td><b>${PUBX[k] || pesc(k)}</b></td><td class="n">${v}</td><td><div class="occ"><i><b style="width:${Math.round((v / tp) * 100)}%"></b></i><span class="n">${Math.round((v / tp) * 100)}%</span></div></td></tr>`).join("")}</tbody><tfoot><tr><td>الإجمالي</td><td>${t.personnel ?? 0}</td><td>100%</td></tr></tfoot></table></div>`;
  const types = [...new Map(F.map((f) => [f.type, f.type_name || f.type])).entries()];
  root.innerHTML = `<div class="repo">${toc([["r1", "school", "ملف المدرسة"], ["r2", "cap", "المراحل والفصول"], ["r3", "users", "المنسوبون"], ["r4", "building", "المرافق"]])}<div>
    ${rsec("r1", "school", "ملف المدرسة", "سجل المدرسة", info)}
    ${rsec("r2", "cap", "المراحل والفصول", `${gt.s} متعلماً`, gTbl)}
    ${rsec("r3", "users", "المنسوبون حسب الفئة", `${t.personnel ?? 0} منسوباً`, pTbl)}
    ${rsec("r4", "building", "سجل المرافق", `<span id="fcount"></span>`, `<div class="rtool"><input id="fq" placeholder="ابحث باسم المرفق أو المبنى"><select id="ft"><option value="">كل الأنواع</option>${types.map(([k, n]) => `<option value="${pesc(k)}">${pesc(n)}</option>`).join("")}</select><button class="btn sm sec" id="fx">تصدير CSV</button></div><div class="twrap"><table class="dt" id="ftbl"><thead><tr><th>#</th><th class="srt">المرفق</th><th class="srt">النوع</th><th class="srt">المبنى</th><th class="srt">الدور</th><th class="srt">السعة</th><th class="srt">الحالة</th></tr></thead><tbody></tbody></table></div>`)}
    <p class="glass-note" style="padding:0">آخر تحديث للبيانات: ${pdate(o.generated_at)}. تعرض الصفحة معلومات عامة وإحصائية فقط، ولا تتضمن أي بيانات شخصية للمنسوبين أو المتعلمين.</p></div></div>`;
  let cur = [];
  const draw = () => { const q = document.getElementById("fq").value.trim(), ty = document.getElementById("ft").value;
    cur = F.filter((f) => (!q || f.name.includes(q) || (f.building || "").includes(q)) && (!ty || f.type === ty));
    document.getElementById("fcount").textContent = `${cur.length} من ${F.length}`;
    document.querySelector("#ftbl tbody").innerHTML = cur.map((f, n) => { const st = FSTAT[f.status] || ["", ""]; return `<tr><td class="idx">${n + 1}</td><td><b>${pesc(f.name)}</b></td><td>${pesc(f.type_name || "")}</td><td>${pesc(f.building || "—")}</td><td>${pesc(f.floor ?? "—")}</td><td class="n">${f.capacity || "—"}</td><td><span class="pill ${tone[f.status] || ""}">${st[0]}</span></td></tr>`; }).join("") || '<tr><td colspan="7">لا توجد مرافق مطابقة.</td></tr>'; };
  document.getElementById("fq").oninput = draw; document.getElementById("ft").oninput = draw; draw(); sortable(document.getElementById("ftbl"));
  document.getElementById("fx").onclick = () => csvDown("المرافق.csv", ["المرفق", "النوع", "المبنى", "الدور", "السعة", "الحالة"], cur.map((f) => [f.name, f.type_name, f.building, f.floor, f.capacity, (FSTAT[f.status] || [""])[0]]));
  tocBind(root);
}
function pubReveal() { const els = document.querySelectorAll(".rv:not(.in)"); if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; } const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.1 }); els.forEach((e) => io.observe(e)); }

let _pp;
function loadStaff() { return (_pp ||= fetch(APP_CONFIG.supabaseUrl + "/rest/v1/rpc/public_staff", { method: "POST", headers: { apikey: APP_CONFIG.supabaseKey, "content-type": "application/json" }, body: "{}" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)); }
async function renderPeople() {
  const root = document.getElementById("people-root"), o = await loadStaff();
  if (!o || !o.published) { root.innerHTML = `<div class="repo"><div class="rsec" style="grid-column:1/-1"><div class="pn"><b>قائمة المنسوبين غير منشورة حالياً</b><p>تظهر هذه الصفحة حين تفعّل إدارة المدرسة النشر العام.</p></div></div></div>`; return; }
  const L = o.staff || [], PC = { teaching: "", administrative: "c3", support: "c4" };
  const spec = [...new Set(L.map((x) => x.specialty).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
  const cnt = (c) => L.filter((x) => x.category === c).length;
  root.innerHTML = `<div class="repo">${toc([["r1", "info", "ملخص السجل"], ["r2", "users", "دليل المنسوبين"]])}<div>
    ${rsec("r1", "info", "ملخص السجل", "المنشور فقط", `<div class="twrap"><table class="dt"><thead><tr><th>الفئة</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>${Object.entries(PUBX).map(([k, n]) => `<tr><td><b>${n}</b></td><td class="n">${cnt(k)}</td><td><div class="occ"><i><b style="width:${L.length ? Math.round((cnt(k) / L.length) * 100) : 0}%"></b></i><span class="n">${L.length ? Math.round((cnt(k) / L.length) * 100) : 0}%</span></div></td></tr>`).join("")}</tbody><tfoot><tr><td>الإجمالي</td><td>${L.length}</td><td>100%</td></tr></tfoot></table></div>`)}
    ${rsec("r2", "users", "دليل المنسوبين", `<span id="pcount"></span>`, `<div class="rtool"><input id="pq" placeholder="ابحث بالاسم أو الوظيفة أو التخصص"><select id="pc"><option value="">كل الفئات</option>${Object.entries(PUBX).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select><select id="ps"><option value="">كل التخصصات</option>${spec.map((x) => `<option>${pesc(x)}</option>`).join("")}</select><button class="btn sm sec" id="px">تصدير CSV</button></div><div class="twrap"><table class="dt" id="ptbl"><thead><tr><th>#</th><th class="srt">الاسم</th><th class="srt">الوظيفة</th><th class="srt">التخصص</th><th class="srt">الفئة</th></tr></thead><tbody></tbody></table></div>`)}
    <p class="glass-note" style="padding:0">تُنشر الأسماء والوظائف والتخصصات لمن وافقت الإدارة على إظهاره فقط، دون أي بيانات تواصل أو شخصية. آخر تحديث: ${pdate(o.generated_at)}.</p></div></div>`;
  let cur = [];
  const draw = () => { const q = document.getElementById("pq").value.trim(), c = document.getElementById("pc").value, s = document.getElementById("ps").value;
    cur = L.filter((x) => (!q || x.name.includes(q) || (x.specialty || "").includes(q) || (x.job_title || "").includes(q)) && (!c || x.category === c) && (!s || x.specialty === s));
    document.querySelector("#ptbl tbody").innerHTML = cur.map((x, n) => `<tr><td class="idx">${n + 1}</td><td><b>${pesc(x.name)}</b>${x.leader ? ' <span class="pill c1">قيادة</span>' : ""}</td><td>${pesc(x.job_title || "—")}</td><td>${pesc(x.specialty || "—")}</td><td><span class="pill ${PC[x.category] || ""}">${PUBX[x.category] || ""}</span></td></tr>`).join("") || '<tr><td colspan="5">لا توجد نتائج مطابقة.</td></tr>';
    document.getElementById("pcount").textContent = `${cur.length} من ${L.length} منسوب`; };
  ["pq", "pc", "ps"].forEach((i) => (document.getElementById(i).oninput = draw)); draw(); sortable(document.getElementById("ptbl"));
  document.getElementById("px").onclick = () => csvDown("المنسوبون.csv", ["الاسم", "الوظيفة", "التخصص", "الفئة"], cur.map((x) => [x.name, x.job_title, x.specialty, PUBX[x.category]]));
  tocBind(root);
}
