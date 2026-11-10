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
const rsec = (id, i, t, small, body) => `<section class="rsec rv" id="${id}"><div class="rh">${ico(i)}<h2>${t}</h2><small>${small || ""}</small></div><div class="rb">${body}</div></section>`;
const kv = (rows) => `<dl class="kv">${rows.map(([i, k, v]) => `<dt>${ico(i)}${k}</dt><dd dir="auto">${v}</dd>`).join("")}</dl>`;
const csvDown = (name, head, rows) => { const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`; const b = new Blob(["\ufeff" + [head, ...rows].map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); };

const dsh = (n, t, p, k) => `<div class="ab-sh ax-rv" data-rv="up"><span>${n}</span><div><small class="ax-kick">${k}</small><h2>${t}</h2><p>${p}</p></div></div>`;
const dsec = (id, head, body) => `<section class="ab-s ax-s" id="ab-${id}">${head}${body}</section>`;
function donut(parts, total) {
  const R = 70, C = 2 * Math.PI * R; let off = 0;
  return `<svg viewBox="0 0 200 200" class="dn-svg" aria-hidden="true"><circle cx="100" cy="100" r="${R}" class="dn-bg"/>${parts.map((p, k) => { const L = total ? (p.v / total) * C : 0, el = `<circle cx="100" cy="100" r="${R}" class="dn-seg" data-k="${k}" style="--c:${p.c};--len:${L.toFixed(1)};--gap:${C.toFixed(1)};stroke-dashoffset:${(-off).toFixed(1)}" transform="rotate(-90 100 100)"/>`; off += L; return el; }).join("")}</svg>`;
}
async function renderData() {
  const root = document.getElementById("data-root"); const o = await loadOverview();
  if (!o || !o.published) { root.innerHTML = `<div class="rsec" style="margin:20px 16px"><div class="pn"><b>البيانات العامة غير منشورة حالياً</b><p>تُظهر هذه الصفحة سجل المدرسة حين تفعّله الإدارة.</p></div></div>`; return; }
  const s = o.school || {}, t = o.totals || {}, F = o.facilities || [], g = o.grades || [], loc = [s.region, s.city, s.district].filter(Boolean).join("، ");
  const tone = { operational: "c4", limited: "c3", closed: "c5" }, PCOL = ["#0f8a94", "#f0b34a", "#7a4bb5", "#2f6fc4", "#d23f4f"];
  const info = kv([["school", "اسم المدرسة", pesc(s.name)], ["info", "المرحلة", pesc(s.stage || "—")], ["info", "النوع", pesc(s.type || "—")], ["users", "الفئة", pesc(GEN[s.gender] || "—")], ["hourglass", "العام الدراسي الحالي", pesc(o.year?.name || "—")], ["pin", "الموقع", pesc(loc || "—")], ["phone", "الهاتف", pesc(s.phone || "—")], ["mail", "البريد الإلكتروني", pesc(s.email || "—")], ["globe", "الموقع الإلكتروني", pesc(s.website || "—")]]);
  const gt = g.reduce((a, x) => ({ c: a.c + x.classes, s: a.s + x.students, k: a.k + (x.capacity || 0) }), { c: 0, s: 0, k: 0 });
  const pers = Object.entries(o.personnel || {}).map(([k, v], n) => ({ k, n: PUBX[k] || k, v, c: PCOL[n % 5] })), tp = pers.reduce((a, x) => a + x.v, 0);
  const types = [...new Map(F.map((f) => [f.type, f.type_name || f.type])).entries()];
  const stats = [["users", "personnel", "منسوبو المدرسة"], ["cap", "students", "المتعلمون"], ["grid", "classes", "الفصول"], ["building", "facilities", "المرافق"]];
  root.innerHTML = `<div class="ab ax dr"><div class="ab-toc" role="navigation" aria-label="أقسام الصفحة">${[["r1", "ملف المدرسة"], ["r2", "المراحل والفصول"], ["r3", "المنسوبون"], ["r4", "المرافق"]].map(([id, n]) => `<button type="button" data-abgo="${id}">${n}</button>`).join("")}</div>
  ${dsec("r1", dsh("01", "ملف المدرسة", "البيانات المعرِّفة بالمدرسة كما تنشرها الإدارة.", "سجل المدرسة"), `<div class="rsec rv"><div class="rb">${info}</div></div>`)}
  ${dsec("r2", dsh("02", "المراحل والفصول", "اضغط أي مرحلة لعرض تفاصيلها ونسبة إشغالها.", "تفاعلي"), `<div class="dr-split"><div class="rsec rv"><div class="rb" id="gl">${g.map((x, k) => { const p = x.capacity ? Math.min(100, Math.round((x.students / x.capacity) * 100)) : 0; return `<button type="button" class="dr-row ${k ? "" : "on"}" data-g="${k}"><span class="dr-n">${pesc(x.name)}</span><span class="dr-b"><i style="--w:${p}%"></i></span><b class="n">${x.students}</b><em>${p}%</em></button>`; }).join("")}<div class="dr-tot"><span>الإجمالي</span><b>${gt.s} متعلماً · ${gt.c} فصول${gt.k ? ` · سعة ${gt.k}` : ""}</b></div></div></div><div class="rsec rv dr-insp" id="gi"></div></div>`)}
  ${dsec("r3", dsh("03", "المنسوبون حسب الفئة", "مرّر أو اضغط على القطاع أو الفئة لإبرازها.", "التوزيع"), `<div class="dr-split"><div class="rsec rv dr-don"><div class="dn-wrap">${donut(pers, tp)}<div class="dn-c"><b id="dnv">${tp}</b><small id="dnl">إجمالي المنسوبين</small></div></div></div><div class="rsec rv"><div class="rb" id="pl">${pers.map((x, k) => `<button type="button" class="dr-row pl" data-p="${k}" style="--c:${x.c}"><span class="dr-n"><i class="dot"></i>${pesc(x.n)}</span><span class="dr-b"><i style="--w:${tp ? Math.round((x.v / tp) * 100) : 0}%"></i></span><b class="n">${x.v}</b><em>${tp ? Math.round((x.v / tp) * 100) : 0}%</em></button>`).join("")}</div></div></div>`)}
  ${dsec("r4", dsh("04", "سجل المرافق", "رقائق التصفية بالنوع، وبحث، وفرز، واضغط الصف لعرض تفاصيله.", "تفاعلي"), `<div class="rsec rv"><div class="rtool"><input id="fq" placeholder="ابحث باسم المرفق أو المبنى"><span class="cnt" id="fcount"></span><button class="btn sm sec" id="fx">تصدير CSV</button></div><div class="chips dr-chips" id="fchips"></div><div class="twrap"><table class="dt" id="ftbl"><thead><tr><th>#</th><th class="srt">المرفق</th><th class="srt">النوع</th><th class="srt">المبنى</th><th class="srt">السعة</th><th class="srt">الحالة</th></tr></thead><tbody></tbody></table></div></div>`)}
  <p class="glass-note" style="padding:0 16px">آخر تحديث للبيانات: ${pdate(o.generated_at)}. تعرض الصفحة معلومات عامة وإحصائية فقط، ولا تتضمن أي بيانات شخصية للمنسوبين أو المتعلمين.</p></div>`;
  // المراحل: لوحة تفاصيل
  const insp = (k) => { const x = g[k]; if (!x) return; const cap = x.capacity || 0, p = cap ? Math.min(100, Math.round((x.students / cap) * 100)) : 0;
    document.getElementById("gi").innerHTML = `<div class="rh"><h2>${pesc(x.name)}</h2><small>تفاصيل المرحلة</small></div><div class="dr-ins"><div class="gauge2" style="--p:${p}"><b>${p}%</b><small>إشغال</small></div><dl class="kv kv2">${[["cap", "المتعلمون", x.students], ["grid", "الفصول", x.classes], ["users", "متوسط الفصل", x.classes ? Math.round(x.students / x.classes) : "—"], ["building", "السعة", cap || "—"], ["up", "مقاعد شاغرة", cap ? Math.max(0, cap - x.students) : "—"]].map(([i, kk, v]) => `<dt>${ico(i)}${kk}</dt><dd>${v}</dd>`).join("")}</dl></div>`; };
  insp(0); root.querySelectorAll("#gl [data-g]").forEach((b) => (b.onclick = () => { root.querySelectorAll("#gl [data-g]").forEach((z) => z.classList.toggle("on", z === b)); insp(+b.dataset.g); }));
  // الدونات
  const dnSel = (k) => { root.querySelectorAll(".dn-seg").forEach((e) => e.classList.toggle("dim", k != null && +e.dataset.k !== k)); root.querySelectorAll("#pl .dr-row").forEach((e) => e.classList.toggle("on", k != null && +e.dataset.p === k)); document.getElementById("dnv").textContent = k == null ? tp : pers[k].v; document.getElementById("dnl").textContent = k == null ? "إجمالي المنسوبين" : pers[k].n; };
  root.querySelectorAll("#pl [data-p]").forEach((b) => { const k = +b.dataset.p; b.onmouseenter = () => dnSel(k); b.onfocus = () => dnSel(k); b.onclick = () => dnSel(k); b.onmouseleave = () => dnSel(null); });
  root.querySelectorAll(".dn-seg").forEach((e) => { const k = +e.dataset.k; e.onmouseenter = () => dnSel(k); e.onmouseleave = () => dnSel(null); e.onclick = () => dnSel(k); });
  // المرافق
  let cur = [], ty = "", open = null;
  const chipsDraw = () => { document.getElementById("fchips").innerHTML = `<button class="fchip ${ty ? "" : "on"}" data-t=""><i></i>الكل <small>${F.length}</small></button>` + types.map(([k, n], z) => `<button class="fchip ${ty === k ? "on" : ""}" data-t="${pesc(k)}"><i class="${["g", "b", "p", "y", "r"][z % 5]}"></i>${pesc(n)} <small>${F.filter((f) => f.type === k).length}</small></button>`).join(""); root.querySelectorAll("#fchips .fchip").forEach((b) => (b.onclick = () => { ty = b.dataset.t; open = null; chipsDraw(); draw(); })); };
  const draw = () => { const q = document.getElementById("fq").value.trim(); cur = F.filter((f) => (!q || f.name.includes(q) || (f.building || "").includes(q)) && (!ty || f.type === ty));
    document.getElementById("fcount").textContent = `${cur.length} من ${F.length}`;
    document.querySelector("#ftbl tbody").innerHTML = cur.map((f, n) => { const st = FSTAT[f.status] || ["", ""]; return `<tr class="fr ${open === n ? "open" : ""}" data-n="${n}" tabindex="0"><td class="idx">${n + 1}</td><td><b>${pesc(f.name)}</b></td><td>${pesc(f.type_name || "")}</td><td>${pesc(f.building || "—")}</td><td class="n">${f.capacity || "—"}</td><td><span class="pill ${tone[f.status] || ""}">${st[0]}</span></td></tr>${open === n ? `<tr class="fd"><td colspan="6"><div class="fdi">${[["building", "المبنى", f.building], ["up", "الدور", f.floor], ["users", "السعة", f.capacity], ["info", "النوع", f.type_name]].map(([i, k, v]) => `<span>${ico(i)}<small>${k}</small><b>${pesc(v ?? "—")}</b></span>`).join("")}</div></td></tr>` : ""}`; }).join("") || '<tr><td colspan="6">لا توجد مرافق مطابقة.</td></tr>';
    document.querySelectorAll("#ftbl .fr").forEach((r) => { const go = () => { open = open === +r.dataset.n ? null : +r.dataset.n; draw(); }; r.onclick = go; r.onkeydown = (e) => { if (e.key === "Enter") go(); }; }); };
  document.getElementById("fq").oninput = () => { open = null; draw(); }; chipsDraw(); draw(); sortable(document.getElementById("ftbl"));
  document.getElementById("fx").onclick = () => csvDown("المرافق.csv", ["المرفق", "النوع", "المبنى", "الدور", "السعة", "الحالة"], cur.map((f) => [f.name, f.type_name, f.building, f.floor, f.capacity, (FSTAT[f.status] || [""])[0]]));
  pubReveal(); if (typeof aboutInit === "function") aboutInit(document);
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("go"); io.unobserve(e.target); } }), { threshold: 0.3 }); root.querySelectorAll(".dr-split,.dn-wrap").forEach((x) => io.observe(x)); } else root.querySelectorAll(".dr-split,.dn-wrap").forEach((x) => x.classList.add("go"));
}
function pubReveal() { const els = document.querySelectorAll(".rv:not(.in)"); if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; } const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.1 }); els.forEach((e) => io.observe(e)); }

let _pp;
function loadStaff() { return (_pp ||= fetch(APP_CONFIG.supabaseUrl + "/rest/v1/rpc/public_staff", { method: "POST", headers: { apikey: APP_CONFIG.supabaseKey, "content-type": "application/json" }, body: "{}" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)); }
async function renderPeople() {
  const root = document.getElementById("people-root"), o = await loadStaff();
  if (!o || !o.published) { root.innerHTML = `<div class="rsec" style="margin:20px 16px"><div class="pn"><b>قائمة المنسوبين غير منشورة حالياً</b><p>تظهر هذه الصفحة حين تفعّل إدارة المدرسة النشر العام.</p></div></div>`; return; }
  const L = o.staff || [], PCOL = { teaching: "#0f8a94", administrative: "#f0b34a", support: "#7a4bb5" }, PC = { teaching: "", administrative: "c3", support: "c4" };
  const cnt = (c) => L.filter((x) => x.category === c).length, cats = Object.keys(PUBX), parts = cats.map((k) => ({ k, n: PUBX[k], v: cnt(k), c: PCOL[k] }));
  const spc = {}; L.forEach((x) => { if (x.specialty) spc[x.specialty] = (spc[x.specialty] || 0) + 1; });
  const spl = Object.entries(spc).sort((a, b) => b[1] - a[1]), mxs = Math.max(1, ...spl.map((x) => x[1]));
  const leaders = L.filter((x) => x.leader);
  root.innerHTML = `<div class="ab ax dr"><div class="ab-toc" role="navigation" aria-label="أقسام الصفحة">${[["p1", "ملخص الأسرة"], ["p2", "القيادة"], ["p3", "التخصصات"], ["p4", "الدليل"]].map(([id, n]) => `<button type="button" data-abgo="${id}">${n}</button>`).join("")}</div>
  ${dsec("p1", dsh("01", "ملخص الأسرة", "مرّر على الفئة لإبرازها، واضغط لتصفية الدليل بها.", "التوزيع"), `<div class="dr-split"><div class="rsec rv dr-don"><div class="dn-wrap">${donut(parts, L.length)}<div class="dn-c"><b id="dnv">${L.length}</b><small id="dnl">إجمالي المنسوبين</small></div></div></div><div class="rsec rv"><div class="rb" id="pl">${parts.map((x, k) => `<button type="button" class="dr-row pl" data-p="${k}" style="--c:${x.c}"><span class="dr-n"><i class="dot"></i>${x.n}</span><span class="dr-b"><i style="--w:${L.length ? Math.round((x.v / L.length) * 100) : 0}%"></i></span><b class="n">${x.v}</b><em>${L.length ? Math.round((x.v / L.length) * 100) : 0}%</em></button>`).join("")}<div class="dr-tot"><span>الإجمالي</span><b>${L.length} منسوباً</b></div></div></div></div>`)}
  ${dsec("p2", dsh("02", "القيادة", "فريق القيادة المدرسية المنشورة بياناته.", "الأسرة"), `<div class="pp-lead">${leaders.length ? leaders.map((x, k) => `<div class="pp-l ax-rv" data-rv="up" style="--d:${k * .08}s"><span class="av">${pesc((x.name || "").trim()[0] || "")}</span><div><b>${pesc(x.name)}</b><small>${pesc(x.job_title || "")}</small></div></div>`).join("") : '<div class="rsec rv"><div class="pn">لم تُنشر بيانات القيادة بعد.</div></div>'}</div>`)}
  ${dsec("p3", dsh("03", "التخصصات", "اضغط تخصصاً لعرض منسوبيه في الدليل.", "تفاعلي"), `<div class="rsec rv"><div class="rb" id="sl">${spl.map(([n, v], k) => `<button type="button" class="dr-row sp" data-s="${pesc(n)}"><span class="dr-n">${pesc(n)}</span><span class="dr-b"><i style="--w:${Math.round((v / mxs) * 100)}%"></i></span><b class="n">${v}</b><em>${Math.round((v / L.length) * 100)}%</em></button>`).join("") || '<div class="pn">لا توجد تخصصات منشورة.</div>'}</div></div>`)}
  ${dsec("p4", dsh("04", "دليل المنسوبين", "بحث وتصفية وفرز وتجميع، واضغط الاسم لعرض بطاقته.", "تفاعلي"), `<div class="rsec rv"><div class="rtool"><input id="pq" placeholder="ابحث بالاسم أو الوظيفة أو التخصص"><span class="cnt" id="pcount"></span><div class="vt"><button class="on" data-v="t">${ico("list")}جدول</button><button data-v="g">${ico("layers")}مجمّع</button></div><button class="btn sm sec" id="px">تصدير CSV</button></div><div class="chips dr-chips" id="pchips"></div><div id="pbody"></div></div>`)}
  <p class="glass-note" style="padding:0 16px">تُنشر الأسماء والوظائف والتخصصات لمن وافقت الإدارة على إظهاره فقط، دون أي بيانات تواصل أو شخصية. آخر تحديث: ${pdate(o.generated_at)}.</p></div>`;
  let c = "", sp = "", view = "t", open = null, cur = [];
  const dnSel = (k) => { root.querySelectorAll(".dn-seg").forEach((e) => e.classList.toggle("dim", k != null && +e.dataset.k !== k)); root.querySelectorAll("#pl .dr-row").forEach((e) => e.classList.toggle("on", k != null && +e.dataset.p === k)); document.getElementById("dnv").textContent = k == null ? L.length : parts[k].v; document.getElementById("dnl").textContent = k == null ? "إجمالي المنسوبين" : parts[k].n; };
  const goDir = () => document.getElementById("ab-p4").scrollIntoView({ behavior: "smooth", block: "start" });
  root.querySelectorAll("#pl [data-p]").forEach((b) => { const k = +b.dataset.p; b.onmouseenter = () => dnSel(k); b.onmouseleave = () => dnSel(null); b.onclick = () => { c = c === parts[k].k ? "" : parts[k].k; chipsDraw(); draw(); goDir(); }; });
  root.querySelectorAll(".dn-seg").forEach((e) => { const k = +e.dataset.k; e.onmouseenter = () => dnSel(k); e.onmouseleave = () => dnSel(null); });
  root.querySelectorAll("#sl [data-s]").forEach((b) => (b.onclick = () => { sp = sp === b.dataset.s ? "" : b.dataset.s; chipsDraw(); draw(); goDir(); }));
  const chipsDraw = () => { document.getElementById("pchips").innerHTML = [["", "الكل", L.length], ...parts.map((x) => [x.k, x.n, x.v])].map(([k, n, v]) => `<button class="fchip ${c === k ? "on" : ""}" data-t="${k}"><i class="${{ "": "", teaching: "b", administrative: "y", support: "p" }[k]}"></i>${n} <small>${v}</small></button>`).join("") + (sp ? `<button class="fchip on" data-x="1">${pesc(sp)} ✕</button>` : ""); root.querySelectorAll("#pchips .fchip").forEach((b) => (b.onclick = () => { if (b.dataset.x) sp = ""; else c = b.dataset.t; open = null; chipsDraw(); draw(); })); };
  const detail = (x) => `<div class="fdi">${[["user", "الاسم", x.name], ["school", "الوظيفة", x.job_title], ["cap", "التخصص", x.specialty], ["users", "الفئة", PUBX[x.category]], ["building", "الإدارة", x.department]].filter((a) => a[2]).map(([i, k, v]) => `<span>${ico(i)}<small>${k}</small><b>${pesc(v)}</b></span>`).join("")}${x.leader ? '<span class="pill c1">قيادة</span>' : ""}</div>`;
  const draw = () => { const q = document.getElementById("pq").value.trim(); cur = L.filter((x) => (!q || x.name.includes(q) || (x.specialty || "").includes(q) || (x.job_title || "").includes(q)) && (!c || x.category === c) && (!sp || x.specialty === sp));
    document.getElementById("pcount").textContent = `${cur.length} من ${L.length}`; const body = document.getElementById("pbody");
    if (view === "t") { body.innerHTML = `<div class="twrap"><table class="dt" id="ptbl"><thead><tr><th>#</th><th class="srt">الاسم</th><th class="srt">الوظيفة</th><th class="srt">التخصص</th><th class="srt">الفئة</th></tr></thead><tbody>${cur.map((x, n) => `<tr class="fr ${open === n ? "open" : ""}" data-n="${n}" tabindex="0"><td class="idx">${n + 1}</td><td><b>${pesc(x.name)}</b>${x.leader ? ' <span class="pill c1">قيادة</span>' : ""}</td><td>${pesc(x.job_title || "—")}</td><td>${pesc(x.specialty || "—")}</td><td><span class="pill ${PC[x.category] || ""}">${PUBX[x.category] || ""}</span></td></tr>${open === n ? `<tr class="fd"><td colspan="5">${detail(x)}</td></tr>` : ""}`).join("") || '<tr><td colspan="5">لا توجد نتائج مطابقة.</td></tr>'}</tbody></table></div>`;
      body.querySelectorAll(".fr").forEach((r) => { const go = () => { open = open === +r.dataset.n ? null : +r.dataset.n; draw(); }; r.onclick = go; r.onkeydown = (e) => { if (e.key === "Enter") go(); }; }); sortable(document.getElementById("ptbl")); }
    else { const G = {}; cur.forEach((x) => { const k = x.specialty || PUBX[x.category] || "أخرى"; (G[k] ||= []).push(x); });
      body.innerHTML = Object.entries(G).sort((a, b) => b[1].length - a[1].length).map(([k, a], n) => `<details class="pp-g" ${n < 3 ? "open" : ""}><summary><b>${pesc(k)}</b><span class="pill">${a.length}</span></summary><div class="pp-gl">${a.map((x) => `<span class="pp-p"><i class="av">${pesc((x.name || "").trim()[0] || "")}</i><span><b>${pesc(x.name)}</b><small>${pesc(x.job_title || "")}</small></span></span>`).join("")}</div></details>`).join("") || '<div class="pn">لا توجد نتائج مطابقة.</div>'; } };
  document.getElementById("pq").oninput = () => { open = null; draw(); };
  root.querySelectorAll(".vt button").forEach((b) => (b.onclick = () => { view = b.dataset.v; open = null; root.querySelectorAll(".vt button").forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  chipsDraw(); draw();
  document.getElementById("px").onclick = () => csvDown("المنسوبون.csv", ["الاسم", "الوظيفة", "التخصص", "الفئة"], cur.map((x) => [x.name, x.job_title, x.specialty, PUBX[x.category]]));
  pubReveal(); if (typeof aboutInit === "function") aboutInit(document);
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("go"); io.unobserve(e.target); } }), { threshold: 0.3 }); root.querySelectorAll(".dr-split,.dn-wrap,.rsec").forEach((x) => io.observe(x)); } else root.querySelectorAll(".dr-split,.dn-wrap,.rsec").forEach((x) => x.classList.add("go"));
}
