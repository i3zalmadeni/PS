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
  if (ring && t?.capacity) { const r = Math.round((t.students / t.capacity) * 100), p = Math.min(100, r); ring.style.setProperty("--p", p); ring.classList.toggle("over", r > 100); document.getElementById("gpct").textContent = r + "%"; document.getElementById("gsub").textContent = `${t.students} متعلماً من ${t.capacity} مقعداً`; }
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
  if (!o || !o.published) { root.innerHTML = `<div class="ab dr"><p class="glass-note">البيانات العامة غير منشورة حالياً. تُظهر هذه الصفحة سجل المدرسة حين تفعّله الإدارة.</p></div>`; return; }
  const s = o.school || {}, t = o.totals || {}, F = o.facilities || [], g = o.grades || [], loc = [s.region, s.city, s.district].filter(Boolean).join("، ");
  const pers = Object.entries(o.personnel || {}), tp = pers.reduce((a, [, v]) => a + v, 0), teach = (o.personnel || {}).teaching || 0;
  const ORD = ["الأرضي", "الأول", "الثاني", "الثالث", "الرابع", "الخامس"], flName = (fn) => (fn == null || fn === "" || fn === "—" ? "" : ORD[+fn] ? "الدور " + ORD[+fn] : "الدور " + pesc(fn));
  const facts = [["school", "المرحلة", s.stage], ["info", "النوع", s.type], ["users", "الفئة", GEN[s.gender]], ["pin", "الموقع", loc], ["phone", "الهاتف", s.phone, s.phone ? "tel:" + s.phone : ""], ["mail", "البريد الإلكتروني", s.email, s.email ? "mailto:" + s.email : ""], ["globe", "الموقع الإلكتروني", s.website, s.website && /^https?:/.test(s.website) ? s.website : ""]].filter((x) => x[2]);
  const glance = [["متعلماً", t.students], ["فصلاً دراسياً", t.classes], ["منسوباً", tp || t.personnel], ["مرفقاً", F.length]];
  const card = `<div class="sc-card ax-rv" data-rv="up"><div class="sc-head"><span class="sc-e" data-core></span><div><small>${[s.type, GEN[s.gender]].filter(Boolean).map(pesc).join(" · ")}</small><h2>${pesc(s.name)}</h2>${o.year?.name ? `<span class="sc-y">العام الدراسي ${pesc(o.year.name)}</span>` : ""}</div></div>
    <div class="sc-gl">${glance.map(([n, v]) => `<div><b data-to="${v || 0}">${v || 0}</b><span>${n}</span></div>`).join("")}</div>
    <dl class="sc-facts">${facts.map(([i, k, v, h]) => `<div${i === "mail" || i === "pin" || i === "globe" ? ' class="wide"' : ""}>${ico(i)}<dt>${k}</dt><dd dir="auto">${h ? `<a href="${pesc(h)}">${pesc(v)}</a>` : pesc(v)}</dd></div>`).join("")}</dl></div>`;
  // المراحل
  const stg = `<div class="sc-tb ax-rv" data-rv="up"><div class="sc-th"><span>المرحلة</span><span>الفصول</span><span>المتعلمون</span><span>السعة</span><span>متوسط الفصل</span></div>${g.map((x) => { const cap = x.capacity || x.students, pc = cap ? Math.round((x.students / cap) * 100) : 0; return `<div class="sc-tr${pc > 100 ? " over" : ""}"><b>${pesc(x.name)}</b><span data-l="الفصول">${x.classes}</span><span data-l="المتعلمون">${x.students}<i style="--w:${Math.min(100, pc)}%"></i><em>${pc}% من السعة</em></span><span data-l="السعة">${cap}</span><span data-l="متوسط الفصل">${x.classes ? Math.round(x.students / x.classes) : "—"}</span></div>`; }).join("")}<div class="sc-tr tot"><b>الإجمالي</b><span data-l="الفصول">${t.classes || 0}</span><span data-l="المتعلمون">${t.students || 0}</span><span data-l="السعة">${t.capacity || 0}</span><span data-l="متوسط الفصل">${t.classes ? Math.round((t.students || 0) / t.classes) : "—"}</span></div></div>`;
  // الأسرة
  const team = `<div class="sc-tm ax-rv" data-rv="up">${pers.map(([k, v]) => `<div><b>${v}</b><span>${PUBX[k] || pesc(k)}</span><small>${tp ? Math.round((v / tp) * 100) : 0}% من المنسوبين</small></div>`).join("")}</div>${teach && t.students ? `<p class="sc-n">بمعدل <b>${((t.students || 0) / teach).toFixed(1)}</b> متعلماً لكل معلم.</p>` : ""}<a class="btn sm sc-b" href="people.html">تعرّف على الأسرة</a>`;
  // المرافق
  const fac = `<div class="sc-ft ax-rv" data-rv="up"><div class="sc-s"><input id="fq" placeholder="ابحث باسم المرفق أو المبنى أو نوعه">${ico("compass")}</div><div class="vt"><button data-v="t">حسب النوع</button><button class="on" data-v="b">حسب المبنى</button></div><span class="cnt" id="fcount"></span></div><div id="fbody"></div>`;
  const toc = [["card", "بطاقة المدرسة"], ["stages", "المراحل والفصول"], ["team", "الأسرة"], ["fac", "المرافق"]];
  root.innerHTML = `<div class="ab ax dr"><div class="ab-toc" role="navigation" aria-label="أقسام الصفحة">${toc.map(([id, n]) => `<button type="button" data-abgo="${id}">${n}</button>`).join("")}</div>
  <section class="ab-s ax-s" id="ab-card">${card}</section>
  ${dsec("stages", dsh("01", "المراحل والفصول", "توزيع المتعلمين والفصول على المراحل الدراسية.", "التعليم"), stg)}
  ${dsec("team", dsh("02", "أسرة المدرسة", "الهيئات العاملة في المدرسة.", "المنسوبون"), team)}
  ${dsec("fac", dsh("03", "مرافق المدرسة", "المعامل والمختبرات والقاعات وسائر المرافق بتفاصيلها.", "المرافق"), fac)}
  <p class="glass-note" style="padding:0 16px">آخر تحديث للبيانات: ${pdate(o.generated_at)}. معلومات عامة وإحصائية فقط، دون أي بيانات شخصية للمنسوبين أو المتعلمين.</p></div>`;
  root.querySelectorAll("[data-core]").forEach((e) => (e.innerHTML = CORE_ICON));
  let view = "b"; const body = document.getElementById("fbody");
  const fc = (f) => { const st = FSTAT[f.status] || ["", ""]; return `<article class="sc-f"><div class="sc-fh"><b>${pesc(f.name)}</b><span class="badge ${st[1]}">${st[0]}</span></div><div class="sc-fm">${[view === "t" ? "" : f.type_name, view === "b" ? "" : f.building, flName(f.floor)].filter(Boolean).map((x) => `<span>${pesc(x)}</span>`).join("")}</div>${f.capacity ? `<div class="sc-fc">${ico("users")}تتسع لـ <b>${f.capacity}</b></div>` : ""}</article>`; };
  const draw = () => { const q = document.getElementById("fq").value.trim(), L = F.filter((f) => !q || [f.name, f.building, f.type_name].some((x) => (x || "").includes(q)));
    document.getElementById("fcount").textContent = `${L.length} من ${F.length}`;
    const G = {}; L.forEach((f) => (G[view === "t" ? f.type_name || f.type : f.building || "غير محدد"] ||= []).push(f));
    body.innerHTML = Object.entries(G).map(([k, a]) => `<section class="sc-g"><h3>${view === "b" ? ico("building") : ""}${pesc(k)}<small>${a.length}</small></h3><div class="sc-fl">${a.map(fc).join("")}</div></section>`).join("") || '<p class="glass-note">لا توجد نتائج مطابقة.</p>'; };
  document.getElementById("fq").oninput = draw; root.querySelectorAll(".vt button").forEach((b) => (b.onclick = () => { view = b.dataset.v; root.querySelectorAll(".vt button").forEach((x) => x.classList.toggle("on", x === b)); draw(); })); draw();
  root.querySelectorAll(".sc-gl b").forEach((n) => animateTo(n, +n.dataset.to));
  pubReveal(); if (typeof aboutInit === "function") aboutInit(document);
}
function pubReveal() { const els = document.querySelectorAll(".rv:not(.in)"); if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; } const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.1 }); els.forEach((e) => io.observe(e)); }

let _pp;
function loadStaff() { return (_pp ||= fetch(APP_CONFIG.supabaseUrl + "/rest/v1/rpc/public_staff", { method: "POST", headers: { apikey: APP_CONFIG.supabaseKey, "content-type": "application/json" }, body: "{}" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)); }
async function renderPeople() {
  const root = document.getElementById("people-root"), o = await loadStaff();
  if (!o || !o.published) { root.innerHTML = `<div class="ab dr"><p class="glass-note">قائمة المنسوبين غير منشورة حالياً. تظهر هذه الصفحة حين تفعّل إدارة المدرسة النشر العام.</p></div>`; return; }
  const L = o.staff || [], cats = Object.keys(PUBX), cnt = (c) => L.filter((x) => x.category === c).length;
  const spl = Object.entries(L.reduce((a, x) => (x.specialty && (a[x.specialty] = (a[x.specialty] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const photo = (x) => (x.photo ? APP_CONFIG.supabaseUrl + "/storage/v1/object/public/public-photos/" + encodeURI(x.photo) : "");
  const img = (x) => (photo(x) ? `<img src="${photo(x)}" alt="${pesc(x.name)}" loading="lazy" onerror="this.remove()">` : "");
  const ini = (x) => pesc((x.name || "").trim()[0] || "");
  const leaders = L.filter((x) => x.leader);
  root.innerHTML = `<div class="ab ax dr"><div class="ab-toc" role="navigation" aria-label="أقسام الصفحة">${[["p1", "القيادة"], ["p2", "الدليل"]].map(([id, n]) => `<button type="button" data-abgo="${id}">${n}</button>`).join("")}</div>
  ${leaders.length ? dsec("p1", dsh("01", "القيادة المدرسية", "من يقود المدرسة.", "الأسرة"), `<div class="ldr">${leaders.map((x, k) => `<button type="button" class="ld t-${x.category} ax-rv" data-rv="up" data-id="${L.indexOf(x)}" style="--d:${k * .1}s"><span class="ld-ph"><b>${ini(x)}</b>${img(x)}</span><span class="ld-t"><small>${pesc(x.job_title || "")}</small><b>${pesc(x.name)}</b></span></button>`).join("")}</div>`) : '<span id="ab-p1" class="ab-s"></span>'}
  ${dsec("p2", dsh("02", "دليل المنسوبين", "جدار صور أو سجل. اضغط أي وجه لعرض ملفه.", "الأسرة"), `<div class="fbar rv"><div class="chips dr-chips" id="pchips"></div><div class="pw-tool"><div class="pw-s"><input id="pq" placeholder="ابحث بالاسم أو الوظيفة أو التخصص">${ico("compass")}</div><select id="psp" aria-label="التخصص"><option value="">كل التخصصات</option>${spl.map(([n, v]) => `<option value="${pesc(n)}">${pesc(n)} (${v})</option>`).join("")}</select><div class="vt"><button class="on" data-v="w">${ico("grid")}جدار الصور</button><button data-v="r">${ico("list")}سجل</button></div><button class="btn sm sec" id="px">تصدير CSV</button></div></div><div class="pw-c"><span id="pcount"></span></div><div id="pbody"></div>`)}
  <p class="glass-note" style="padding:0 16px">تُنشر الأسماء والصور والوظائف والتخصصات لمن وافقت الإدارة على إظهاره فقط، دون أي بيانات تواصل أو شخصية. آخر تحديث: ${pdate(o.generated_at)}.</p></div>`;
  let c = "", sp = "", view = "w", cur = [];
  const chipsDraw = () => { document.getElementById("pchips").innerHTML = [["", "الكل", L.length], ...cats.map((k) => [k, PUBX[k], cnt(k)])].map(([k, n, v]) => `<button class="fchip ${c === k ? "on" : ""}" data-t="${k}"><i class="${{ "": "", teaching: "b", administrative: "y", support: "p" }[k]}"></i>${n} <small>${v}</small></button>`).join("") + ""; root.querySelectorAll("#pchips .fchip").forEach((b) => (b.onclick = () => { if (b.dataset.x) sp = ""; else c = b.dataset.t; chipsDraw(); draw(); })); };
  const draw = () => { const q = document.getElementById("pq").value.trim(); cur = L.filter((x) => (!q || x.name.includes(q) || (x.specialty || "").includes(q) || (x.job_title || "").includes(q)) && (!c || x.category === c) && (!sp || x.specialty === sp));
    document.getElementById("pcount").textContent = `${cur.length} من ${L.length} منسوب`; const body = document.getElementById("pbody");
    body.innerHTML = !cur.length ? '<p class="glass-note">لا توجد نتائج مطابقة.</p>' : view === "w"
      ? `<div class="pwall">${cur.map((x, n) => `<button type="button" class="pw t-${x.category}" data-id="${L.indexOf(x)}" style="--d:${Math.min(n, 16) * .035}s"><b class="pw-i">${ini(x)}</b>${img(x)}<span class="pw-k">${PUBX[x.category] || ""}</span><span class="pw-o"><strong>${pesc(x.name)}</strong><small>${pesc(x.specialty || x.job_title || "")}</small></span></button>`).join("")}</div>`
      : `<div class="roster">${cur.map((x, n) => `<button type="button" class="rr t-${x.category}" data-id="${L.indexOf(x)}" style="--d:${Math.min(n, 16) * .03}s"><em>${String(n + 1).padStart(2, "0")}</em><span class="rr-p"><b>${ini(x)}</b>${img(x)}</span><span class="rr-n"><strong>${pesc(x.name)}</strong><small>${pesc(x.job_title || "")}</small></span><span class="rr-s">${pesc(x.specialty || "—")}</span><span class="rr-c">${PUBX[x.category] || ""}</span></button>`).join("")}</div>`;
  };
  // ملف الشخص (نافذة تفصيلية بتنقّل)
  let ord = [], at = 0;
  const open = (id) => { ord = cur.length ? cur.map((x) => L.indexOf(x)) : [id]; at = Math.max(0, ord.indexOf(id)); show(); };
  const show = () => { const x = L[ord[at]]; let ov = document.getElementById("spov"); if (!ov) { ov = document.createElement("div"); ov.id = "spov"; ov.className = "sp-ov"; document.body.appendChild(ov); ov.onclick = (e) => { if (e.target === ov) closeSp(); }; }
    ov.innerHTML = `<div class="sp-p t-${x.category}" role="dialog" aria-modal="true"><button class="sp-x" aria-label="إغلاق">✕</button><div class="sp-ph"><b>${ini(x)}</b>${img(x)}</div><div class="sp-d"><span class="pc-b t-${x.category}">${PUBX[x.category] || ""}</span><h2>${pesc(x.name)}</h2>${x.leader ? `<span class="pc-l" style="position:static;align-self:flex-start">${ico("star")}قيادة</span>` : ""}<dl>${[["school", "الوظيفة", x.job_title], ["cap", "التخصص", x.specialty], ["building", "الإدارة", x.department]].filter((a) => a[2]).map(([i, k, v]) => `<dt>${ico(i)}${k}</dt><dd>${pesc(v)}</dd>`).join("")}</dl><div class="sp-n"><button class="btn sm sec" id="spp">السابق</button><span>${at + 1} / ${ord.length}</span><button class="btn sm sec" id="spn">التالي</button></div></div></div>`;
    ov.classList.add("on"); ov.querySelector(".sp-x").onclick = closeSp; ov.querySelector("#spp").onclick = () => { at = (at - 1 + ord.length) % ord.length; show(); }; ov.querySelector("#spn").onclick = () => { at = (at + 1) % ord.length; show(); }; };
  const closeSp = () => document.getElementById("spov")?.classList.remove("on");
  addEventListener("keydown", (e) => { const ov = document.getElementById("spov"); if (!ov?.classList.contains("on")) return; if (e.key === "Escape") closeSp(); if (e.key === "ArrowLeft") ov.querySelector("#spn")?.click(); if (e.key === "ArrowRight") ov.querySelector("#spp")?.click(); });
  root.addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b) open(+b.dataset.id); });
  document.getElementById("psp").onchange = (e) => { sp = e.target.value; draw(); };
  document.getElementById("pq").oninput = draw;
  root.querySelectorAll(".vt button").forEach((b) => (b.onclick = () => { view = b.dataset.v; root.querySelectorAll(".vt button").forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  chipsDraw(); draw();
  document.getElementById("px").onclick = () => csvDown("المنسوبون.csv", ["الاسم", "الوظيفة", "التخصص", "الفئة"], cur.map((x) => [x.name, x.job_title, x.specialty, PUBX[x.category]]));
  pubReveal(); if (typeof aboutInit === "function") aboutInit(document);
}
