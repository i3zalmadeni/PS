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
  const root = document.getElementById("data-root"); const [o, st] = await Promise.all([loadOverview(), loadStaff()]);
  if (!o || !o.published) { root.innerHTML = `<div class="ab dr"><p class="glass-note">البيانات العامة غير منشورة حالياً. تُظهر هذه الصفحة سجل المدرسة حين تفعّله الإدارة.</p></div>`; return; }
  const s = o.school || {}, t = o.totals || {}, F = o.facilities || [], g = o.grades || [], loc = [s.region, s.city, s.district].filter(Boolean).join("، ");
  const GC = ["#0f8a94", "#f0b34a", "#7a4bb5", "#2f6fc4", "#d23f4f"], PCOL = { teaching: "#0f8a94", administrative: "#f0b34a", support: "#7a4bb5" };
  const pers = Object.entries(o.personnel || {}), tp = pers.reduce((a, [, v]) => a + v, 0), pct = t.capacity ? Math.round((t.students / t.capacity) * 100) : 0;
  const staff = st && st.published ? st.staff || [] : [], PH = (x) => x.photo ? APP_CONFIG.supabaseUrl + "/storage/v1/object/public/public-photos/" + encodeURI(x.photo) : "";
  const TABS = [["school", "school", "المدرسة"], ["rooms", "grid", "القاعات الدراسية"], ["team", "users", "الأسرة"], ["plan", "building", "المرافق"]];
  // ---- المدرسة
  const idc = `<div class="idc"><div class="idc-m"><span class="idc-e" data-core></span><div><small>${pesc(s.type || "")}${s.gender ? " · " + pesc(GEN[s.gender] || "") : ""}</small><h3>${pesc(s.name)}</h3><div class="idc-t">${[s.stage, o.year?.name && "العام " + o.year.name].filter(Boolean).map((x) => `<span>${pesc(x)}</span>`).join("")}</div></div></div><div class="idc-g">${[["pin", "الموقع", loc, ""], ["phone", "الهاتف", s.phone, s.phone ? "tel:" + s.phone : ""], ["mail", "البريد الإلكتروني", s.email, s.email ? "mailto:" + s.email : ""], ["globe", "الموقع الإلكتروني", s.website, s.website && /^https?:/.test(s.website) ? s.website : ""]].filter((x) => x[2]).map(([i, k, v, h]) => `<${h ? `a href="${pesc(h)}"` : "div"} class="idc-c"><span>${ico(i)}</span><small>${k}</small><b dir="auto">${pesc(v)}</b></${h ? "a" : "div"}>`).join("")}</div></div>`;
  const R = 54, C = 2 * Math.PI * R;
  const p1 = `<div class="x-two">${idc}<div class="x-gauge"><svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="${R}" class="gb"/><circle cx="70" cy="70" r="${R}" class="gf" style="--c:${C.toFixed(1)};--o:${(C * (1 - pct / 100)).toFixed(1)}" transform="rotate(-90 70 70)"/></svg><div><b>${pct}%</b><small>الإشغال الكلي</small></div><p>${t.students || 0} متعلماً من ${t.capacity || 0} مقعداً</p></div></div>`;
  // ---- القاعات
  const rooms = (x) => { const n = Math.max(1, x.classes || 1), cap = x.capacity ? Math.ceil(x.capacity / n) : Math.ceil(x.students / n); return Array.from({ length: n }, (_, i) => ({ i, st: Math.floor(x.students / n) + (i < x.students % n ? 1 : 0), cap })); };
  const desks = (r, big) => { let d = ""; for (let k = 0; k < r.cap; k++) d += `<i class="${k < r.st ? "f" : ""}" style="--k:${k}"></i>`; return `<div class="dk${big ? " big" : ""}">${d}</div>`; };
  const p2 = `<div class="x-gs" id="gs">${g.map((x, k) => `<button type="button" class="${k ? "" : "on"}" data-g="${k}" style="--g:${GC[k % 5]}"><b>${pesc(x.name)}</b><small>${x.classes} فصول · ${x.students} متعلماً</small></button>`).join("")}</div><div class="x-rm"><div class="x-rg" id="rg"></div><aside class="x-rd" id="rd"></aside></div>`;
  // ---- الأسرة
  const p3 = `<div class="x-tm"><div class="x-dn"><svg viewBox="0 0 200 200" id="dnsvg">${(() => { let off = 0; return pers.map(([k, v], z) => { const L = tp ? (v / tp) * (2 * Math.PI * 80) : 0, e = `<circle class="dn" data-c="${k}" cx="100" cy="100" r="80" style="--col:${PCOL[k] || "#999"};stroke-dasharray:${L.toFixed(1)} ${(2 * Math.PI * 80).toFixed(1)};stroke-dashoffset:${(-off).toFixed(1)}" transform="rotate(-90 100 100)"/>`; off += L; return e; }).join(""); })()}</svg><div class="dnc"><b id="dnn">${tp}</b><small id="dnl">منسوباً</small></div></div><div class="x-tc"><div class="x-tl">${pers.map(([k, v]) => `<button type="button" data-c="${k}" style="--c:${PCOL[k] || "#999"}"><i></i><span>${PUBX[k] || pesc(k)}</span><b>${v}</b><em>${tp ? Math.round((v / tp) * 100) : 0}%</em><u style="--w:${tp ? Math.round((v / tp) * 100) : 0}%"></u></button>`).join("")}</div><div class="x-fc" id="fc"></div><a class="btn sm" href="people.html">تصفّح الأسرة كاملة</a></div></div>`;
  // ---- المرافق
  const B = {}; F.forEach((f, idx) => { ((B[f.building || "غير محدد"] ||= {})[f.floor ?? "—"] ||= []).push({ ...f, idx }); });
  const types = [...new Map(F.map((f) => [f.type, f.type_name || f.type])).entries()], ST = { operational: "ok", limited: "lim", closed: "cl" };
  const flName = (fn) => fn === "0" ? "الأرضي" : "الدور " + pesc(fn);
  const p4 = `<div class="x-pt"><input id="fq" placeholder="ابحث باسم المرفق"><div class="x-ch" id="fchips"></div></div><div class="x-pm"><div class="x-bs" id="plan">${Object.entries(B).map(([bn, fl]) => `<div class="x-b"><div class="x-roof"><span>${ico("building")}${pesc(bn)}</span></div>${Object.entries(fl).sort((a, b) => (+b[0] || 0) - (+a[0] || 0)).map(([fn, a]) => `<div class="x-fl"><em>${flName(fn)}</em><div class="x-rs">${a.map((f) => `<button type="button" class="x-r st-${ST[f.status] || "ok"}" data-i="${f.idx}" data-t="${pesc(f.type)}" style="flex-grow:${Math.max(1, Math.min(8, Math.round((f.capacity || 20) / 15)))}"><b>${pesc(f.name)}</b><small>${pesc(f.type_name || "")}</small></button>`).join("")}</div></div>`).join("")}<div class="x-gnd"></div></div>`).join("")}</div><aside class="x-fd" id="fi"><p>اختر مرفقاً من المخطط لعرض تفاصيله.</p></aside></div>`;
  root.innerHTML = `<div class="x-wrap"><div class="x-tabs" role="tablist">${TABS.map(([id, i, n], k) => `<button type="button" role="tab" data-t="${id}" class="${k ? "" : "on"}">${ico(i)}<span>${n}</span></button>`).join("")}<i class="x-ink"></i></div>${[p1, p2, p3, p4].map((h, k) => `<section class="x-p${k ? "" : " on"}" data-p="${TABS[k][0]}" role="tabpanel">${h}</section>`).join("")}<p class="glass-note">آخر تحديث للبيانات: ${pdate(o.generated_at)}. معلومات عامة وإحصائية فقط، دون أي بيانات شخصية للمنسوبين أو المتعلمين.</p></div>`;
  fillLive(o); root.querySelectorAll("[data-core]").forEach((e) => (e.innerHTML = CORE_ICON));
  // التبويبات
  const tabs = root.querySelector(".x-tabs"), ink = tabs.querySelector(".x-ink"), P = [...root.querySelectorAll(".x-p")];
  const go = (id) => { tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.t === id)); P.forEach((x) => { const on = x.dataset.p === id; x.classList.toggle("on", on); if (on) { x.classList.remove("in"); void x.offsetWidth; x.classList.add("in"); } }); const b = tabs.querySelector("button.on"); ink.style.width = b.offsetWidth + "px"; ink.style.transform = `translateX(${b.offsetLeft}px)`; try { history.replaceState(null, "", "#" + id); } catch (e) {} };
  tabs.querySelectorAll("button").forEach((b) => (b.onclick = () => go(b.dataset.t)));
  tabs.onkeydown = (e) => { const bs = [...tabs.querySelectorAll("button")], i = bs.findIndex((b) => b.classList.contains("on")); if (e.key === "ArrowLeft") { bs[(i + 1) % bs.length].click(); bs[(i + 1) % bs.length].focus(); } if (e.key === "ArrowRight") { bs[(i + bs.length - 1) % bs.length].click(); bs[(i + bs.length - 1) % bs.length].focus(); } };
  go(TABS.some((x) => x[0] === location.hash.slice(1)) ? location.hash.slice(1) : "school"); addEventListener("resize", () => go(tabs.querySelector("button.on").dataset.t));
  // القاعات
  let gi = 0, ri = 0; const rg = document.getElementById("rg"), rd = document.getElementById("rd");
  const room = () => { const x = g[gi], R2 = rooms(x), r = R2[ri] || R2[0]; rd.innerHTML = `<div class="rd-b"><span>السبورة</span></div><div class="rd-t"></div>${desks(r, 1)}<h4>${pesc(x.name)} · فصل ${r.i + 1}</h4><div class="rd-s"><span>${ico("users")}${r.st} متعلماً</span><span>${ico("grid")}سعة ${r.cap}</span><span>${ico("up")}${Math.max(0, r.cap - r.st)} شاغر</span></div>`; };
  const drawR = () => { const x = g[gi]; if (!x) { rg.innerHTML = '<p class="glass-note">لا توجد مراحل منشورة.</p>'; return; } rg.style.setProperty("--g", GC[gi % 5]); rg.innerHTML = rooms(x).map((r) => `<button type="button" class="x-rc ${r.i === ri ? "on" : ""}" data-r="${r.i}" style="--d:${r.i * .07}s"><b>فصل ${r.i + 1}</b>${desks(r)}<small>${r.st} / ${r.cap}</small></button>`).join(""); rg.querySelectorAll(".x-rc").forEach((b) => (b.onclick = () => { ri = +b.dataset.r; rg.querySelectorAll(".x-rc").forEach((z) => z.classList.toggle("on", z === b)); room(); })); room(); };
  root.querySelectorAll("#gs button").forEach((b) => (b.onclick = () => { gi = +b.dataset.g; ri = 0; root.querySelectorAll("#gs button").forEach((z) => z.classList.toggle("on", z === b)); drawR(); })); drawR();
  // الأسرة
  const fc = document.getElementById("fc"), dnn = document.getElementById("dnn"), dnl = document.getElementById("dnl"), tl = root.querySelector(".x-tl");
  const pick = (c) => { tl.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.c === c)); root.querySelectorAll(".dn").forEach((d) => { d.classList.toggle("hit", d.dataset.c === c); d.classList.toggle("dim", !!c && d.dataset.c !== c); }); const v = c ? (o.personnel[c] || 0) : tp; dnn.textContent = v; dnl.textContent = c ? PUBX[c] : "منسوباً"; const L = staff.filter((x) => !c || x.category === c).slice(0, 14); fc.innerHTML = L.length ? L.map((x, k) => `<a href="people.html" class="x-f" title="${pesc(x.name)}" style="--d:${k * .04}s"><b>${pesc((x.name || "").trim()[0] || "")}</b>${PH(x) ? `<img src="${PH(x)}" alt="${pesc(x.name)}" loading="lazy" onerror="this.remove()">` : ""}</a>`).join("") : ""; };
  tl.querySelectorAll("button").forEach((b) => { b.onmouseenter = b.onfocus = () => pick(b.dataset.c); b.onclick = () => pick(b.dataset.c); }); tl.onmouseleave = () => pick(""); pick("");
  // المرافق
  let ty = "", sel = null; const dr = () => { const q = document.getElementById("fq").value.trim(); document.querySelectorAll("#plan .x-r").forEach((b) => { const f = F[+b.dataset.i], ok = (!q || f.name.includes(q) || (f.building || "").includes(q)) && (!ty || f.type === ty); b.classList.toggle("off", !ok); b.classList.toggle("on", sel === +b.dataset.i); }); };
  const cd = () => { document.getElementById("fchips").innerHTML = `<button class="${ty ? "" : "on"}" data-t="">الكل <small>${F.length}</small></button>` + types.map(([k, n]) => `<button class="${ty === k ? "on" : ""}" data-t="${pesc(k)}">${pesc(n)} <small>${F.filter((f) => f.type === k).length}</small></button>`).join(""); root.querySelectorAll("#fchips button").forEach((b) => (b.onclick = () => { ty = b.dataset.t; cd(); dr(); })); };
  document.getElementById("fq").oninput = dr; cd(); dr();
  document.querySelectorAll("#plan .x-r").forEach((b) => (b.onclick = () => { sel = +b.dataset.i; const f = F[sel], s2 = FSTAT[f.status] || ["", ""]; dr(); const fi = document.getElementById("fi"); fi.classList.remove("in"); void fi.offsetWidth; fi.classList.add("in"); fi.innerHTML = `<span class="fi-i">${ico("building")}</span><h4>${pesc(f.name)}</h4><span class="badge ${s2[1]}">${s2[0]}</span><ul><li>${ico("info")}${pesc(f.type_name || "")}</li><li>${ico("building")}${pesc(f.building || "—")}</li><li>${ico("up")}${flName(f.floor ?? "—")}</li>${f.capacity ? `<li>${ico("users")}سعة ${f.capacity}</li>` : ""}</ul>`; }));
  pubReveal();
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
  root.innerHTML = `<div class="ab ax dr"><div class="ab-toc" role="navigation" aria-label="أقسام الصفحة">${[["p1", "القيادة"], ["p2", "الدليل"], ["p3", "التخصصات"]].map(([id, n]) => `<button type="button" data-abgo="${id}">${n}</button>`).join("")}</div>
  ${leaders.length ? dsec("p1", dsh("01", "القيادة المدرسية", "من يقود المدرسة.", "الأسرة"), `<div class="ldr">${leaders.map((x, k) => `<button type="button" class="ld t-${x.category} ax-rv" data-rv="up" data-id="${L.indexOf(x)}" style="--d:${k * .1}s"><span class="ld-ph"><b>${ini(x)}</b>${img(x)}</span><span class="ld-t"><small>${pesc(x.job_title || "")}</small><b>${pesc(x.name)}</b></span></button>`).join("")}</div>`) : '<span id="ab-p1" class="ab-s"></span>'}
  ${dsec("p2", dsh("02", "دليل المنسوبين", "جدار صور أو سجل. اضغط أي وجه لعرض ملفه.", "الأسرة"), `<div class="pw-tool rv"><div class="pw-s"><input id="pq" placeholder="ابحث بالاسم أو الوظيفة أو التخصص">${ico("compass")}</div><div class="vt"><button class="on" data-v="w">${ico("grid")}جدار الصور</button><button data-v="r">${ico("list")}سجل</button></div><button class="btn sm sec" id="px">تصدير CSV</button></div><div class="chips dr-chips" id="pchips"></div><div class="pw-c"><span id="pcount"></span></div><div id="pbody"></div>`)}
  ${dsec("p3", dsh("03", "التخصصات", "اضغط تخصصاً لتصفية الدليل به.", "التوزيع"), `<div class="spec rv">${spl.map(([n, v], k) => `<button type="button" class="sp" data-s="${pesc(n)}" style="--w:${Math.round((v / spl[0][1]) * 100)}%"><span class="sp-n">${pesc(n)}</span><span class="sp-b"><i></i></span><b>${v}</b></button>`).join("") || '<p class="glass-note">لا توجد تخصصات منشورة.</p>'}</div>`)}
  <p class="glass-note" style="padding:0 16px">تُنشر الأسماء والصور والوظائف والتخصصات لمن وافقت الإدارة على إظهاره فقط، دون أي بيانات تواصل أو شخصية. آخر تحديث: ${pdate(o.generated_at)}.</p></div>`;
  let c = "", sp = "", view = "w", cur = [];
  const chipsDraw = () => { document.getElementById("pchips").innerHTML = [["", "الكل", L.length], ...cats.map((k) => [k, PUBX[k], cnt(k)])].map(([k, n, v]) => `<button class="fchip ${c === k ? "on" : ""}" data-t="${k}"><i class="${{ "": "", teaching: "b", administrative: "y", support: "p" }[k]}"></i>${n} <small>${v}</small></button>`).join("") + (sp ? `<button class="fchip on" data-x="1">${pesc(sp)} ✕</button>` : ""); root.querySelectorAll("#pchips .fchip").forEach((b) => (b.onclick = () => { if (b.dataset.x) sp = ""; else c = b.dataset.t; chipsDraw(); draw(); })); };
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
  root.querySelectorAll("#ab-p3 .sp").forEach((b) => (b.onclick = () => { sp = sp === b.dataset.s ? "" : b.dataset.s; chipsDraw(); draw(); document.getElementById("ab-p2").scrollIntoView({ behavior: "smooth", block: "start" }); }));
  document.getElementById("pq").oninput = draw;
  root.querySelectorAll(".vt button").forEach((b) => (b.onclick = () => { view = b.dataset.v; root.querySelectorAll(".vt button").forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  chipsDraw(); draw();
  document.getElementById("px").onclick = () => csvDown("المنسوبون.csv", ["الاسم", "الوظيفة", "التخصص", "الفئة"], cur.map((x) => [x.name, x.job_title, x.specialty, PUBX[x.category]]));
  pubReveal(); if (typeof aboutInit === "function") aboutInit(document);
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("go"); io.unobserve(e.target); } }), { threshold: 0.2 }); root.querySelectorAll(".spec").forEach((x) => io.observe(x)); } else root.querySelectorAll(".spec").forEach((x) => x.classList.add("go"));
}
