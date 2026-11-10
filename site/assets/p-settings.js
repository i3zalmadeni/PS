const SCOPE_AR = { "school:read": "قراءة بيانات المدرسة", "staff:read": "قراءة المنسوبين", "students:read": "قراءة المتعلمين", "facilities:read": "قراءة المرافق", "identity:verify": "التحقق من الهوية", "changes:read": "قراءة موجز التغييرات" };
const SYS_ST = { planned: "مخطط", active: "نشط", suspended: "موقوف" };
const IMP_TABLE = { personnel: "staff_members", students: "students", facilities: "facilities" };
boot("settings.html", async (m, c) => {
  let tab = "systems";
  const TABS = [["systems", "الأنظمة والتكامل"], ["logs", "سجل الوصول"], ["audit", "سجل العمليات"], ["imports", "عمليات الاستيراد"], ["api", "توثيق الواجهة"], ["backup", "النسخ والاستعادة"]];
  const paint = () => {
    m.innerHTML = head("إعدادات النواة والتكامل", "ربط الأنظمة المستقلة بالنواة عبر واجهة قراءة آمنة ومسجلة") + `<div class="tabs">${TABS.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${n}</button>`).join("")}</div><div id="body"></div>`;
    m.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => { tab = b.dataset.t; paint(); }));
    ({ systems, logs, audit, imports, api: apiDoc, backup })[tab](m.querySelector("#body"));
  };

  async function systems(b) {
    const { data } = await sb.from("systems").select("code,name_ar,description,status,scopes,last_seen_at").order("name_ar"); const S = data || [];
    b.innerHTML = `<div class="alert">الأنظمة المستقلة تقرأ من النواة فقط ولا تكتب فيها. يُمنح كل نظام أقل نطاق ممكن، ويظهر مفتاحه مرة واحدة عند إنشائه.</div><div class="tw"><table><thead><tr><th>النظام</th><th>الحالة</th><th>النطاقات</th><th>آخر اتصال</th><th></th></tr></thead><tbody>${S.map((s) => `<tr><td>${esc(s.name_ar)}<br><small>${esc(s.code)}</small></td><td><span class="badge ${s.status === "active" ? "ok" : ""}">${SYS_ST[s.status] || s.status}</span></td><td>${(s.scopes || []).map((x) => `<span class="badge">${esc(SCOPE_AR[x] || x)}</span>`).join(" ") || "—"}</td><td>${fmtT(s.last_seen_at)}</td>
      <td class="acts"><button class="btn sm sec" data-e="${s.code}">النطاقات والحالة</button><button class="btn sm gold" data-k="${s.code}">مفتاح جديد</button></td></tr>`).join("")}</tbody></table></div>`;
    b.querySelectorAll("[data-k]").forEach((x) => (x.onclick = async () => {
      if (!confirm("سيُبطَل المفتاح الحالي فوراً ويُعرض الجديد مرة واحدة. متابعة؟")) return;
      const r = await sb.rpc("rotate_system_key", { p_code: x.dataset.k }); if (r.error) { toast(mapErr(r.error), true); return; }
      const md = modal(`<h3>مفتاح النظام الجديد</h3><p>انسخه الآن وسلّمه لمطور النظام بقناة آمنة؛ لن يظهر مرة أخرى.</p><input readonly dir="ltr" value="${esc(r.data)}" onfocus="this.select()"><div class="acts mt"><button class="btn" id="cx">تم النسخ</button></div>`); md.el.querySelector("#cx").onclick = () => { md.close(); paint(); };
    }));
    b.querySelectorAll("[data-e]").forEach((x) => (x.onclick = () => {
      const s = S.find((z) => z.code === x.dataset.e);
      const md = modal(`<h3>${esc(s.name_ar)}</h3><form id="f"><label>الحالة</label><select name="status">${opts(SYS_ST, s.status)}</select><label class="mt">النطاقات الممنوحة</label>${Object.entries(SCOPE_AR).map(([k, n]) => `<label class="chk"><input type="checkbox" name="sc" value="${k}" ${(s.scopes || []).includes(k) ? "checked" : ""}> ${n} <small>(${k})</small></label>`).join("")}<p class="err" id="fe"></p><div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
      md.el.querySelector("#cx").onclick = md.close;
      md.el.querySelector("#f").onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.target); const r = await sb.from("systems").update({ status: fd.get("status"), scopes: fd.getAll("sc") }).eq("code", s.code); if (r.error) { md.el.querySelector("#fe").textContent = mapErr(r.error); return; } md.close(); toast("تم الحفظ"); paint(); };
    }));
  }

  async function logs(b) {
    const { data } = await sb.from("system_access_logs").select("*").order("created_at", { ascending: false }).limit(200);
    b.innerHTML = `<div class="tw"><table><thead><tr><th>الوقت</th><th>النظام</th><th>الطلب</th><th>الاستجابة</th><th>السجلات</th></tr></thead><tbody>${(data || []).map((l) => `<tr><td>${fmtT(l.created_at)}</td><td>${esc(l.system_code)}</td><td dir="ltr">${esc(l.method)} ${esc(l.path)}</td><td><span class="badge ${l.status < 300 ? "ok" : "bad"}">${l.status}</span></td><td>${l.record_count ?? "—"}</td></tr>`).join("") || '<tr><td colspan="5">لا توجد طلبات مسجلة بعد.</td></tr>'}</tbody></table></div><p class="sub">آخر 200 طلب.</p>`;
  }

  async function audit(b) {
    const { data } = await sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
    const TN = { staff_members: "المنسوبون", students: "المتعلمون", facilities: "المرافق", school_profile: "المدرسة", student_enrollments: "تسجيل المتعلمين", class_sections: "الفصول", academic_years: "الأعوام" };
    b.innerHTML = `<div class="tw"><table><thead><tr><th>الوقت</th><th>السجل</th><th>العملية</th><th>المنفِّذ</th></tr></thead><tbody>${(data || []).map((a) => `<tr><td>${fmtT(a.created_at)}</td><td>${esc(TN[a.table_name] || a.table_name)}</td><td>${L.act[a.action] || esc(a.action)}</td><td><small>${esc(String(a.actor_id || a.user_id || "—").slice(0, 8))}</small></td></tr>`).join("") || '<tr><td colspan="4">لا توجد عمليات.</td></tr>'}</tbody></table></div>`;
  }

  async function imports(b) {
    const { data } = await sb.from("import_jobs").select("*").order("created_at", { ascending: false }).limit(100);
    b.innerHTML = `<div class="tw"><table><thead><tr><th>الوقت</th><th>السجل</th><th>الملف</th><th>الصفوف</th><th>جديد</th><th>محدَّث</th><th>متجاهل</th><th></th></tr></thead><tbody>${(data || []).map((j) => `<tr><td>${fmtT(j.created_at)}</td><td>${esc(L.reg[j.registry] || j.registry || "—")}</td><td>${esc(j.file_name)}</td><td>${j.total_rows}</td><td>${j.created_count}</td><td>${j.updated_count}</td><td>${j.skipped_count}</td>
      <td>${j.rolled_back_at ? '<span class="badge">تم التراجع</span>' : (j.created_ids || []).length && IMP_TABLE[j.registry] ? `<button class="btn sm sec" data-r="${j.id}">تراجع عن المضاف</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="8">لا توجد عمليات استيراد.</td></tr>'}</tbody></table></div><p class="sub">التراجع يحذف السجلات التي أضافتها العملية فقط، وتُمنع إن ارتبطت ببيانات أخرى، ولا يمسّ السجلات المحدَّثة.</p>`;
    b.querySelectorAll("[data-r]").forEach((x) => (x.onclick = async () => {
      const j = data.find((z) => z.id === x.dataset.r); if (!confirm(`حذف ${j.created_ids.length} سجل أضافتها هذه العملية؟`)) return;
      const r = await sb.from(IMP_TABLE[j.registry]).delete().in("id", j.created_ids); if (r.error) { toast(mapErr(r.error), true); return; }
      await sb.from("import_jobs").update({ rolled_back_at: new Date().toISOString(), status: "rolled_back" }).eq("id", j.id); toast("تم التراجع"); paint();
    }));
  }

  function apiDoc(b) {
    const base = APP_CONFIG.supabaseUrl + "/functions/v1/core-api";
    const E = [["GET /v1/school", "school:read", "ملف المدرسة والعام الحالي"], ["GET /v1/staff?updated_since=&limit=&cursor=", "staff:read", "المنسوبون (بلا بيانات التواصل)"], ["GET /v1/staff/{id}", "staff:read", "منسوب بمعرّفه الثابت"],
      ["GET /v1/students?year=&grade=", "students:read", "المتعلمون وتسجيلهم"], ["GET /v1/facilities", "facilities:read", "المرافق والمسؤولون"], ["GET /v1/identity/verify?user_id=|staff_id=", "identity:verify", "التحقق من وجود هوية دون كشف بياناتها"], ["GET /v1/changes?since=&registry=", "changes:read", "موجز التغييرات (معرّفات فقط)"]];
    b.innerHTML = `<div class="card"><p>العنوان الأساسي:</p><input readonly dir="ltr" value="${esc(base)}" onfocus="this.select()"><p class="mt">المصادقة: ترويسة <code dir="ltr">x-system-key: &lt;المفتاح&gt;</code>. القراءة فقط؛ لا توجد نقاط كتابة للأنظمة الخارجية.</p></div>
      <div class="tw mt"><table><thead><tr><th>النقطة</th><th>النطاق</th><th>الوصف</th></tr></thead><tbody>${E.map(([p, s, d]) => `<tr><td dir="ltr">${esc(p)}</td><td>${s}</td><td>${d}</td></tr>`).join("")}</tbody></table></div>
      <div class="card mt"><b>قواعد التكامل</b><ul><li>المعرّفات UUID ثابتة ولا تتغير عبر الأعوام.</li><li>تنبيه التغييرات عبر <code>/v1/changes</code> بمعرّفات فقط، ثم يجلب النظام السجل بنطاقه.</li><li>بيانات التواصل لا تُعاد عبر الواجهة.</li><li>يُسجَّل كل طلب في سجل الوصول، وتُرفض الطلبات غير المصرح بها.</li></ul></div>`;
  }

  function backup(b) {
    b.innerHTML = `<div class="card"><b>النسخ الاحتياطي</b><ul><li>نسخة أمان من بيانات ما قبل إعادة الهيكلة محفوظة في مخطط <code dir="ltr">backup_20261110</code> وفرع <code dir="ltr">backup/pre-core-restructure-20261110</code>.</li><li>النسخ الدورية والاستعادة لنقطة زمنية تُدار من لوحة Supabase (Database ← Backups).</li><li>لا يُحذف أي بيان عند بدء عام جديد؛ يُجمَّد العام المنتهي ويبقى قابلاً للاطلاع والتصدير.</li></ul></div>`;
  }
  paint();
}, { admin: true });
