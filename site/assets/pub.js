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

async function renderData() {
  const root = document.getElementById("data-root"); const o = await loadOverview();
  if (!o || !o.published) { root.innerHTML = `<div class="tgrid"><div class="tcard t6"><h3>البيانات العامة غير منشورة حالياً</h3><p>تُظهر هذه الصفحة ملخصاً إحصائياً حين تفعّله إدارة المدرسة.</p></div></div>`; return; }
  const s = o.school || {}, loc = [s.region, s.city, s.district].filter(Boolean).join("، ");
  const FT = ["ok", "warn", "bad"], tone = { operational: 4, limited: 3, closed: 5 };
  const types = [...new Map((o.facilities || []).map((f) => [f.type, f.type_name || f.type])).entries()];
  const info = [["pin", "الموقع", loc], ["phone", "الهاتف", s.phone], ["mail", "البريد", s.email], ["globe", "الموقع الإلكتروني", s.website]].filter((x) => x[2]);
  const mx = (o.grades || []).length;
  root.innerHTML = `<div class="sechd rv"><span class="tg">${ico("school")}</span><h2>${pesc(s.name)}</h2><small>${[s.stage, s.type, GEN[s.gender]].filter(Boolean).map(pesc).join(" · ")}</small></div>
    <div class="tgrid">${info.map(([i, k, v], n) => `<div class="tcard t${n} rv"><div class="th"><div class="ti">${ico(i)}</div></div><p class="tm">${k}</p><h3 dir="auto">${pesc(v)}</h3></div>`).join("") || '<div class="tcard t6"><p>لم تُنشر بيانات التواصل.</p></div>'}</div>
    <div class="sechd rv"><span class="tg">${ico("cap")}</span><h2>المتعلمون حسب المرحلة</h2></div><div class="tgrid" id="live-grades"></div>
    <div class="sechd rv"><span class="tg">${ico("users")}</span><h2>المنسوبون حسب الفئة</h2></div><div class="tgrid">${Object.entries(o.personnel || {}).map(([k, v], n) => { const tot = o.totals?.personnel || 1, p = Math.round((v / tot) * 100); return `<div class="tcard t${[1, 3, 2][n % 3]} rv"><div class="th"><div class="ti">${ico("users")}</div><span class="tn">${v}</span></div><h3>${PUBX[k] || pesc(k)}</h3><p class="tm">${p}% من إجمالي المنسوبين</p><div class="tbar"><i style="width:${p}%"></i></div></div>`; }).join("")}</div>
    <div class="sechd rv"><span class="tg">${ico("building")}</span><h2>المرافق</h2><small id="fcount"></small></div>
    <div class="tb"><div class="srch"><input id="fq" placeholder="ابحث باسم المرفق أو المبنى">${ico("compass")}</div><div class="chips" id="fchips"></div><div class="vt"><button class="on" data-v="g">${ico("grid")}بطاقات</button><button data-v="l">${ico("menu")}قائمة</button></div></div>
    <div class="tgrid" id="fgrid"></div><p class="glass-note">آخر تحديث للبيانات: ${pdate(o.generated_at)}. تعرض الصفحة معلومات عامة وإحصائية فقط، ولا تتضمن أي بيانات شخصية للمنسوبين أو المتعلمين.</p>`;
  fillLive(o);
  let ty = "", view = "g"; const F = o.facilities || [];
  const chipsDraw = () => { document.getElementById("fchips").innerHTML = `<button class="fchip ${ty ? "" : "on"}" data-t=""><i></i>الكل <small>${F.length}</small></button>` + types.map(([k, n]) => `<button class="fchip ${ty === k ? "on" : ""}" data-t="${pesc(k)}"><i class="${["g", "b", "p", "y", "r"][types.findIndex((z) => z[0] === k) % 5]}"></i>${pesc(n)} <small>${F.filter((f) => f.type === k).length}</small></button>`).join(""); document.querySelectorAll("#fchips .fchip").forEach((b) => (b.onclick = () => { ty = b.dataset.t; chipsDraw(); draw(); })); };
  const draw = () => { const q = document.getElementById("fq").value.trim(); const r = F.filter((f) => (!q || f.name.includes(q) || (f.building || "").includes(q)) && (!ty || f.type === ty));
    document.getElementById("fcount").textContent = `${r.length} من ${F.length}`;
    const gr = document.getElementById("fgrid"); gr.className = view === "g" ? "tgrid" : "lst";
    gr.innerHTML = r.map((f) => { const st = FSTAT[f.status] || ["", ""]; return `<div class="tcard t${tone[f.status] ?? 0} rv in"><div class="th"><div class="ti">${ico("building")}</div><span class="badge ${st[1]}">${st[0]}</span></div><h3>${pesc(f.name)}</h3><p class="tm">${pesc(f.type_name || "")}${f.building ? " · " + pesc(f.building) : ""}${f.floor ? " · دور " + pesc(f.floor) : ""}${f.capacity ? " · سعة " + f.capacity : ""}</p></div>`; }).join("") || '<p class="sub">لا توجد مرافق مطابقة.</p>'; };
  document.getElementById("fq").oninput = draw; chipsDraw(); draw();
  root.querySelectorAll(".vt button").forEach((b) => (b.onclick = () => { view = b.dataset.v; root.querySelectorAll(".vt button").forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  pubReveal();
}
function pubReveal() { const els = document.querySelectorAll(".rv:not(.in)"); if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; } const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.1 }); els.forEach((e) => io.observe(e)); }

let _pp;
function loadStaff() { return (_pp ||= fetch(APP_CONFIG.supabaseUrl + "/rest/v1/rpc/public_staff", { method: "POST", headers: { apikey: APP_CONFIG.supabaseKey, "content-type": "application/json" }, body: "{}" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)); }
async function renderPeople() {
  const root = document.getElementById("people-root"), o = await loadStaff();
  if (!o || !o.published) { root.innerHTML = `<div class="tgrid"><div class="tcard t6"><h3>قائمة المنسوبين غير منشورة حالياً</h3><p>تظهر هذه الصفحة حين تفعّل إدارة المدرسة النشر العام.</p></div></div>`; return; }
  const L = o.staff || [], cnt = (c) => L.filter((x) => x.category === c).length, TC = { teaching: 1, administrative: 3, support: 4 };
  root.innerHTML = `<div class="sechd rv"><span class="tg">${ico("users")}</span><h2>دليل المنسوبين</h2><small id="pcount"></small></div>
    <div class="tb"><div class="srch"><input id="pq" placeholder="ابحث بالاسم أو التخصص">${ico("compass")}</div><div class="chips" id="pchips"></div><div class="vt"><button class="on" data-v="g">${ico("grid")}بطاقات</button><button data-v="l">${ico("menu")}قائمة</button></div></div>
    <div class="tgrid" id="pgrid"></div><p class="glass-note">تُنشر الأسماء والوظائف والتخصصات لمن وافقت الإدارة على إظهاره فقط، دون أي بيانات تواصل أو بيانات شخصية. آخر تحديث: ${pdate(o.generated_at)}.</p>`;
  let c = "", view = "g";
  const dot = { "": "", teaching: "b", administrative: "y", support: "g" };
  const chipsDraw = () => { document.getElementById("pchips").innerHTML = [["", "الكل", L.length], ...Object.entries(PUBX).map(([k, n]) => [k, n, cnt(k)])].map(([k, n, v]) => `<button class="fchip ${c === k ? "on" : ""}" data-t="${k}"><i class="${dot[k]}"></i>${n} <small>${v}</small></button>`).join(""); document.querySelectorAll("#pchips .fchip").forEach((b) => (b.onclick = () => { c = b.dataset.t; chipsDraw(); draw(); })); };
  const draw = () => { const q = document.getElementById("pq").value.trim(); const r = L.filter((x) => (!q || x.name.includes(q) || (x.specialty || "").includes(q)) && (!c || x.category === c));
    const gr = document.getElementById("pgrid"); gr.className = view === "g" ? "tgrid" : "lst";
    gr.innerHTML = r.map((x) => `<div class="tcard t${TC[x.category] ?? 0} rv in"><div class="th"><div class="ti">${ico(x.category === "teaching" ? "cap" : x.category === "administrative" ? "school" : "users")}</div>${x.leader ? '<span class="badge ok">قيادة</span>' : ""}</div><h3>${pesc(x.name)}</h3><p class="tm">${pesc(x.job_title || PUBX[x.category] || "")}${x.specialty ? " · " + pesc(x.specialty) : ""}</p></div>`).join("") || '<p class="sub">لا توجد نتائج مطابقة.</p>';
    document.getElementById("pcount").textContent = `${r.length} من ${L.length} منسوب`; };
  document.getElementById("pq").oninput = draw; chipsDraw(); draw();
  root.querySelectorAll(".vt button").forEach((b) => (b.onclick = () => { view = b.dataset.v; root.querySelectorAll(".vt button").forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  pubReveal();
}
