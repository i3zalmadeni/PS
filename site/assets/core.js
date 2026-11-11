const sb = supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);
const FN = APP_CONFIG.supabaseUrl + "/functions/v1/core-api";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const qs = (k) => new URLSearchParams(location.search).get(k);
const fmt = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "short", day: "numeric" }) : "—");
const fmtT = (d) => (d ? new Date(d).toLocaleString("ar-SA-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }) : "—");
const L = {
  acct: { none: "بلا حساب", invited: "مدعو", active: "نشط", suspended: "موقوف" },
  emp: { active: "على رأس العمل", on_leave: "في إجازة", transferred: "منقول", ended: "منتهية خدمته" },
  stu: { enrolled: "منتظم", transferred_out: "منقول", graduated: "متخرج", withdrawn: "منسحب" },
  etype: { new: "مستجد", transfer_in: "منقول إلينا", returning: "عائد" },
  fstatus: { operational: "يعمل", limited: "جزئي", closed: "مغلق" },
  year: { planned: "مخطط", current: "حالي", closed: "مغلق" },
  gender: { boys: "بنين", girls: "بنات", mixed: "مختلط" },
  rel: { father: "الأب", mother: "الأم", brother: "الأخ", uncle: "العم أو الخال", other: "آخر" },
  rkind: { functional: "وظيفي", organizational: "تنظيمي", technical: "تقني" },
  level: { view: "اطلاع", add: "إضافة", edit: "تعديل", approve: "اعتماد" },
  reg: { school: "المدرسة", personnel: "المنسوبين", students: "المتعلمين", facilities: "المرافق" },
  act: { INSERT: "إضافة", UPDATE: "تعديل", DELETE: "حذف", rotate_key: "تجديد مفتاح" },
};
const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}" ${k === sel ? "selected" : ""}>${esc(v)}</option>`).join("");
const head = (t, s) => `<h2>${esc(t)}</h2>${s ? `<p class="sub">${esc(s)}</p>` : ""}`;
const today = () => new Date().toISOString().slice(0, 10);
const nn = (v) => (v === "" || v === undefined || v === null ? null : typeof v === "string" ? v.trim() || null : v);
const num = (v) => (v === "" || v === undefined || v === null ? null : Number(v));
const FIELD_AR = { full_name: "الاسم", category: "الفئة", job_title: "المسمى", specialty: "التخصص", qualification: "المؤهل", employment_status: "الحالة الوظيفية", department: "القسم", photo_path: "الصورة", account_status: "الحساب", student_no: "رقم الطالب", study_status: "الحالة الدراسية", birth_date: "تاريخ الميلاد", nationality: "الجنسية", grade_code: "الصف", section_id: "الفصل", status: "الحالة", name: "الاسم", type_code: "النوع", building: "المبنى", floor: "الدور", room_no: "رقم الغرفة", area_m2: "المساحة", capacity: "الطاقة الاستيعابية", description: "الوصف", primary_staff_id: "المسؤول الرئيسي", backup_staff_id: "المسؤول البديل", official_name: "الاسم الرسمي", ministry_no: "الرقم الوزاري", phone: "الجوال", email: "البريد", employee_no: "الرقم الوظيفي", address: "العنوان", quantity: "الكمية" };

function toast(msg, bad) { const d = document.createElement("div"); d.className = "toast" + (bad ? " bad" : ""); d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 3500); }
function modal(html, wide) {
  const ov = document.createElement("div"); ov.className = "ov"; ov.innerHTML = `<div class="md" role="dialog" aria-modal="true" ${wide ? 'style="max-width:860px"' : ""}>${html}</div>`;
  const close = () => ov.remove(); ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
  document.body.appendChild(ov); return { el: ov.firstChild, close };
}
function mapErr(e) {
  const m = e?.message || String(e);
  if (/staff_private_email|staff_private_employee/.test(m)) return "البريد أو الرقم الوظيفي مستخدم لمنسوب آخر.";
  if (/students_student_no_key/.test(m)) return "رقم الطالب مستخدم لطالب آخر.";
  if (/student_enrollments_student_id_year_id_key/.test(m)) return "للمتعلم تسجيل في هذا العام بالفعل.";
  if (/class_sections_year_id_grade_code_name_key/.test(m)) return "اسم الفصل مكرر في هذه المرحلة.";
  if (/academic_years_name_key/.test(m)) return "اسم العام مستخدم.";
  if (/academic_years_one_current/.test(m)) return "يوجد عام دراسي حالي بالفعل.";
  if (/ministry_no/.test(m)) return "الرقم الوزاري مستخدم.";
  if (/العام الدراسي مغلق/.test(m)) return "العام الدراسي مغلق ولا يمكن تعديل بياناته.";
  if (/row-level security/.test(m)) return "لا تملك صلاحية تنفيذ هذه العملية.";
  if (/violates foreign key/.test(m)) return "السجل مرتبط ببيانات أخرى ولا يمكن حذفه.";
  return m;
}
async function api(path, body) {
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch(FN + path, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + session.access_token, apikey: APP_CONFIG.supabaseKey }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(({ account_exists: "للمنسوب حساب بالفعل", password_too_short: "كلمة المرور أقصر من 10 أحرف", invalid_email: "بريد غير صالح", forbidden: "غير مصرح" })[j.error] || j.error || "فشل الطلب"); return j;
}

// تصدير جدول إلى Excel
function exportXlsx(name, headers, rows) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "البيانات"); XLSX.writeFile(wb, `${name}-${today()}.xlsx`);
}
// رابط موقّع لملف في حاوية الوسائط الخاصة
async function signed(path) { if (!path) return null; const r = await sb.storage.from("registry-media").createSignedUrl(path, 3600); return r.data?.signedUrl || null; }
async function uploadMedia(folder, id, file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("الصور بصيغة JPG أو PNG أو WebP فقط");
  if (file.size > 5 * 1024 * 1024) throw new Error("الصورة أكبر من 5 ميجابايت");
  const path = `${folder}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${file.type.split("/")[1]}`;
  const r = await sb.storage.from("registry-media").upload(path, file, { contentType: file.type }); if (r.error) throw new Error(r.error.message.includes("row-level") ? "لا تملك صلاحية رفع الصور" : r.error.message); return path;
}
// سجل التغييرات لسجل واحد (يظهر وفق صلاحيات القراءة على جدول التدقيق)
async function showHistory(table, id, title) {
  let q = sb.from("audit_logs").select("*").eq("table_name", table); if (id) q = q.eq("record_id", id);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(60);
  const diff = (a) => {
    if (a.action !== "UPDATE") return a.action === "INSERT" ? "إنشاء السجل" : "حذف السجل";
    const o = a.old_data || {}, n = a.new_data || {}; const ch = Object.keys(n).filter((k) => !["updated_at", "is_active"].includes(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]));
    return ch.map((k) => `${esc(FIELD_AR[k] || k)}: ${esc(o[k] ?? "—")} ← ${esc(n[k] ?? "—")}`).join("<br>") || "—";
  };
  const md = modal(`<h3>سجل التغييرات: ${esc(title)}</h3>${error ? '<p class="err">لا تملك صلاحية عرض السجل.</p>' : `<div class="tw"><table><thead><tr><th>التاريخ</th><th>العملية</th><th>التفاصيل</th></tr></thead><tbody>${(data || []).map((a) => `<tr><td>${fmtT(a.created_at)}</td><td>${L.act[a.action] || a.action}</td><td>${diff(a)}</td></tr>`).join("") || '<tr><td colspan="3">لا توجد تغييرات مسجلة.</td></tr>'}</tbody></table></div>`}<div class="acts mt"><button class="btn sec" id="cx">إغلاق</button></div>`, true);
  md.el.querySelector("#cx").onclick = md.close;
}

const NAV = [["dashboard.html", "الرئيسية", "home", "ملخص النواة والأعداد المحسوبة"], ["school.html", "سجل المدرسة", "school", "الملف والقيادة والأعوام والمراحل والفصول"], ["staff.html", "سجل المنسوبين", "users", "الهيئة التعليمية والإدارية والمساندة", null, "personnel_total"],
  ["students.html", "سجل المتعلمين", "cap", "الهوية والتسجيل لكل عام", "students:view", "students_total"], ["facilities.html", "سجل المرافق", "building", "الموقع والمسؤولون والتجهيزات", null, "facilities_total"],
  ["access.html", "المستخدمون والصلاحيات", "lock", "الأدوار والصلاحيات", "admin"], ["settings.html", "إعدادات النواة والتكامل", "gear", "الأنظمة والمفاتيح والسجلات", "admin"]];
async function boot(page, render, o = {}) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace("login.html"); return; }
  // خطأ في القراءة (صلاحيات/شبكة) لا يعني أن الحساب غير مرتبط: لا نُخرج المستخدم بسببه.
  const fail = (err) => {
    console.error(err);
    const msg = /permission denied|row-level security/i.test(err?.message || "") ? "لا تملك حسابك صلاحية قراءة بياناتك من النواة. تواصل مع مدير النظام." : "تعذر الاتصال بالخادم أو التحقق من حسابك.";
    document.getElementById("shell").innerHTML = `<main class="wrap"><div class="card" style="max-width:520px;margin:48px auto"><h3 style="margin-top:0">تعذر فتح لوحة التحكم</h3><p class="err">${esc(msg)}</p><div class="acts mt"><button class="btn" id="rt">إعادة المحاولة</button><button class="btn sec" id="lo">تسجيل الخروج</button></div></div></main>`;
    document.getElementById("rt").onclick = () => location.reload();
    document.getElementById("lo").onclick = async () => { await sb.auth.signOut(); location.replace("login.html"); };
  };
  const { data: me, error: meErr } = await sb.from("staff_members").select("id,full_name,category,job_title").eq("user_id", session.user.id).maybeSingle();
  if (meErr) { fail(meErr); return; }
  if (!me) { await sb.auth.signOut(); location.replace("login.html?e=nostaff"); return; }
  const { data: adm, error: admErr } = await sb.rpc("is_core_admin"); if (admErr) { fail(admErr); return; } const isAdmin = adm === true;
  const { data: pr, error: prErr } = await sb.from("staff_permissions").select("permission_code").eq("staff_id", me.id); if (prErr) { fail(prErr); return; }
  const have = new Set((pr || []).map((x) => x.permission_code));
  const can = (code) => {
    if (isAdmin) return true; const [r, l] = code.split(":");
    return ({ view: [`${r}:view`, `${r}:add`, `${r}:edit`], add: [`${r}:add`, `${r}:edit`] }[l] || [code]).some((x) => have.has(x));
  };
  if ((o.admin && !isAdmin) || (o.perm && !can(o.perm))) { location.replace("dashboard.html"); return; }
  const ctx = { me, isAdmin, can, uid: session.user.id };
  const items = NAV.filter((n) => !n[4] || (n[4] === "admin" ? isAdmin : can(n[4])));
  document.getElementById("shell").innerHTML =
    `<header><div class="wrap top">${brandHTML("dashboard.html")}<button class="navtoggle" aria-label="القائمة" aria-expanded="false">${ico("menu")}</button>
     <nav><a href="index.html">الموقع</a><a href="data.html">بيانات المدرسة</a><a href="dashboard.html" class="on">لوحة التحكم</a></nav><span class="who">${ico("user")}${esc(me.full_name)}</span>${headMoe}<a class="loginbtn" href="#" id="out">خروج</a></div>
     <div class="dnav"><div class="wrap"><div class="dnav-in">${items.map(([h, n, e, t, , bd]) => `<a href="${h}" title="${esc(t)}" class="${h === page ? "on" : ""}" ${h === page ? 'aria-current="page"' : ""}>${ico(e)}${n}${bd ? `<span class="bdg" data-b="${bd}"></span>` : ""}</a>`).join("")}</div></div></div></header><main class="wrap" id="main"></main>${footerHTML}`; bindNav();
  document.getElementById("out").onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.replace("login.html"); };
  sb.rpc("school_stats").then(({ data }) => { if (data) document.querySelectorAll("[data-b]").forEach((e) => { const v = data[e.dataset.b]; if (v !== undefined) e.textContent = v; }); });
  const main = document.getElementById("main");
  try { await render(main, ctx); } catch (e) { console.error(e); main.innerHTML = '<p class="err">تعذر تحميل الصفحة.</p>'; }
}

// واجهة استيراد Excel مشتركة بين السجلات. cfg: { registry, table, label, fields:[[key,label,[synonyms]]], sample:[...], prepare(), plan(get,ctx,seen,i)->{errs,mid,rec,name}, create(rec,ctx,uid)->id, update(id,rec,ctx), noRollback }
function importUI(host, cfg, c, onDone) {
  const nrm = (s) => String(s ?? "").trim();
  host.innerHTML = `<div class="card"><h3 class="sec" style="margin-top:0">استيراد ${esc(cfg.label)} من Excel</h3><p class="sub">معاينة ومطابقة وفحص التكرار قبل التنفيذ، وتُستورد الصفوف الصحيحة فقط.</p>
    <div class="acts"><button class="btn sec" id="tpl">تنزيل القالب</button><input type="file" id="fl" accept=".xlsx,.xls,.csv" style="width:auto"></div><div id="map" class="mt"></div><div id="prev" class="mt"></div></div>`;
  host.querySelector("#tpl").onclick = () => exportXlsx(`قالب-${cfg.label}`, cfg.fields.map((f) => f[1].replace(" *", "")), [cfg.sample]);
  let data = [], plan = [], fname = "", cx = null;
  host.querySelector("#fl").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return; fname = f.name;
    if (f.size > 5 * 1024 * 1024) { toast("الملف أكبر من 5 ميجابايت", true); return; }
    const wb = XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: true });
    data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }); if (!data.length) { toast("الملف فارغ", true); return; }
    const cols = Object.keys(data[0]);
    host.querySelector("#map").innerHTML = `<h3 class="sec">مطابقة الأعمدة (${data.length} صف)</h3><div class="fg">${cfg.fields.map(([k, l, syn]) => {
      const g = cols.find((x) => syn.some((s) => nrm(x) === s));
      return `<div><label>${esc(l)}</label><select data-f="${k}"><option value="">—</option>${cols.map((x) => `<option ${x === g ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>`;
    }).join("")}</div><div class="acts mt"><button class="btn" id="pv">معاينة وفحص</button></div>`;
    host.querySelector("#prev").innerHTML = ""; host.querySelector("#pv").onclick = preview;
  };
  async function preview() {
    const map = Object.fromEntries([...host.querySelectorAll("[data-f]")].map((s) => [s.dataset.f, s.value]));
    const req = cfg.fields.filter((f) => f[1].includes("*") && !map[f[0]]); if (req.length) { toast("حدد عمود: " + req.map((f) => f[1].replace(" *", "")).join("، "), true); return; }
    cx = await cfg.prepare(); const seen = new Set();
    plan = data.map((r, i) => { const get = (k) => (map[k] ? r[map[k]] : ""); const p = cfg.plan(get, cx, seen, i); return { i: i + 2, ...p }; });
    const ok = plan.filter((p) => !p.errs.length), nw = ok.filter((p) => !p.mid).length, bad = plan.length - ok.length;
    host.querySelector("#prev").innerHTML = `<h3 class="sec">نتيجة الفحص</h3><div class="grid"><div class="card stat"><b>${nw}</b><span>جديد</span></div><div class="card stat"><b>${ok.length - nw}</b><span>تحديث لسجل قائم</span></div><div class="card stat"><b>${bad}</b><span>أخطاء (لن تُستورد)</span></div></div>
      ${bad ? `<div class="tw mt"><table><thead><tr><th>الصف</th><th>الاسم</th><th>الخطأ</th></tr></thead><tbody>${plan.filter((p) => p.errs.length).map((p) => `<tr><td>${p.i}</td><td>${esc(p.name)}</td><td class="err">${esc(p.errs.join("، "))}</td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="acts mt"><button class="btn" id="go" ${ok.length ? "" : "disabled"}>استيراد الصحيح فقط (${ok.length})</button></div>`;
    host.querySelector("#go").onclick = () => run(ok);
  }
  async function run(ok) {
    const btn = host.querySelector("#go"); btn.disabled = true; btn.textContent = "جارٍ الاستيراد…";
    const created = [], errors = []; let upd = 0;
    for (const p of ok) {
      try { if (p.mid) { await cfg.update(p.mid, p.rec, cx); upd++; } else created.push(await cfg.create(p.rec, cx, c.uid)); } catch (e) { errors.push({ row: p.i, error: mapErr(e) }); }
    }
    const skipped = plan.length - ok.length + errors.length;
    await sb.from("import_jobs").insert({ registry: cfg.registry, file_name: fname, status: errors.length && !created.length && !upd ? "failed" : "completed", total_rows: plan.length, created_count: created.length, updated_count: upd, skipped_count: skipped, error_report: [...plan.filter((p) => p.errs.length).map((p) => ({ row: p.i, error: p.errs.join("، ") })), ...errors], created_ids: created, created_by: c.uid });
    toast(`أُنشئ ${created.length} وحُدّث ${upd} وتُجوهل ${skipped}`); host.innerHTML = ""; onDone && onDone();
  }
}
