boot("students.html", async (m, c) => {
  const canAdd = c.can("students:add"), canEdit = c.can("students:edit"), canContact = c.can("students_contact:view") || canEdit;
  const [yr, gr, sc] = await Promise.all([sb.from("academic_years").select("*").order("created_at", { ascending: false }), sb.from("grade_levels").select("*").order("sort_order"), sb.from("class_sections").select("*").order("name")]);
  const Y = yr.data || [], G = gr.data || [], S = sc.data || [], cur = Y.find((y) => y.status === "current");
  const GN = Object.fromEntries(G.map((g) => [g.code, g.name_ar])), SN = Object.fromEntries(S.map((s) => [s.id, s.name]));
  let rows = [], yearId = cur?.id || "";
  async function load() {
    let q;
    if (!yearId || yearId === cur?.id) q = sb.from("students_current").select("*").order("full_name").limit(5000);
    else q = sb.from("student_enrollments").select("id,year_id,grade_code,section_id,status,students(*)").eq("year_id", yearId).limit(5000);
    const r = await q; if (r.error) { toast(mapErr(r.error), true); rows = []; return; }
    rows = (r.data || []).map((x) => (x.students ? { ...x.students, enrollment_id: x.id, year_id: x.year_id, grade_code: x.grade_code, section_id: x.section_id, enrollment_status: x.status } : x));
  }
  await load();
  const isCur = () => !yearId || yearId === cur?.id;
  function filtered() {
    const q = m.querySelector("#q").value.trim(), g = m.querySelector("#fg").value, s = m.querySelector("#fs").value, st = m.querySelector("#ft").value;
    return rows.filter((r) => (!q || r.full_name.includes(q) || (r.student_no || "").includes(q)) && (!g || r.grade_code === g) && (!s || r.section_id === s) && (!st || r.study_status === st));
  }
  function paint() {
    m.innerHTML = head("سجل المتعلمين", "الهوية الثابتة للمتعلم، وتسجيله في كل عام دراسي دون حذف التاريخ") +
      (cur ? "" : '<div class="alert">لا يوجد عام دراسي حالي، فلا يمكن تسجيل المتعلمين قبل إنشائه من سجل المدرسة.</div>') +
      `<div class="bar"><input id="q" placeholder="بحث بالاسم أو رقم الطالب"><select id="fy">${Y.map((y) => `<option value="${y.id}" ${y.id === yearId ? "selected" : ""}>${esc(y.name)} (${L.year[y.status]})</option>`).join("")}</select>
        <select id="fg"><option value="">كل المراحل</option>${G.map((g) => `<option value="${g.code}">${esc(g.name_ar)}</option>`).join("")}</select>
        <select id="fs"><option value="">كل الفصول</option>${S.filter((s) => s.year_id === yearId).map((s) => `<option value="${s.id}">${esc(GN[s.grade_code] || "")} - ${esc(s.name)}</option>`).join("")}</select>
        <select id="ft"><option value="">كل الحالات</option>${opts(L.stu)}</select>
        ${canAdd && cur ? '<button class="btn" id="add">إضافة متعلم</button><button class="btn sec" id="imp">استيراد Excel</button>' : ""}<button class="btn sec" id="ex">تصدير Excel</button><button class="btn sec" id="hs">سجل التغييرات</button></div>
      <div id="impbox"></div><div class="tw"><table><thead><tr><th>رقم الطالب</th><th>الاسم</th><th>المرحلة</th><th>الفصل</th><th>الحالة</th><th></th></tr></thead><tbody id="tb"></tbody></table></div><p class="sub" id="cnt"></p>`;
    ["q", "fg", "fs", "ft"].forEach((i) => m.querySelector("#" + i).addEventListener("input", draw));
    m.querySelector("#fy").onchange = async (e) => { yearId = e.target.value; await load(); paint(); };
    if (m.querySelector("#add")) { m.querySelector("#add").onclick = () => form(null); m.querySelector("#imp").onclick = openImport; }
    m.querySelector("#hs").onclick = () => showHistory("students", null, "سجل المتعلمين");
    m.querySelector("#ex").onclick = () => exportXlsx("سجل-المتعلمين", ["رقم الطالب", "الاسم", "المرحلة", "الفصل", "الحالة الدراسية", "الجنسية", "تاريخ الميلاد"], filtered().map((r) => [r.student_no, r.full_name, GN[r.grade_code], SN[r.section_id], L.stu[r.study_status], r.nationality, r.birth_date]));
    m.querySelector("#tb").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; const r = rows.find((x) => x.id === b.dataset.id); b.dataset.k === "d" ? details(r) : form(r); };
    draw();
  }
  function draw() {
    const l = filtered();
    m.querySelector("#tb").innerHTML = l.map((r) => `<tr><td>${esc(r.student_no || "—")}</td><td>${esc(r.full_name)}</td><td>${esc(GN[r.grade_code] || "—")}</td><td>${esc(SN[r.section_id] || "—")}</td><td><span class="badge ${r.study_status === "enrolled" ? "ok" : ""}">${L.stu[r.study_status]}</span></td>
      <td class="acts"><button class="btn sm sec" data-k="d" data-id="${r.id}">التفاصيل</button>${canEdit && isCur() ? `<button class="btn sm sec" data-k="e" data-id="${r.id}">تعديل</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="6">لا توجد نتائج.</td></tr>';
    m.querySelector("#cnt").textContent = `${l.length} من ${rows.length} متعلم`;
  }

  async function details(r) {
    const [en, pv, gd] = await Promise.all([sb.from("student_enrollments").select("*,academic_years(name)").eq("student_id", r.id).order("created_at", { ascending: false }),
      canContact ? sb.from("student_private").select("*").eq("student_id", r.id).maybeSingle() : { data: null }, canContact ? sb.from("student_guardians").select("relation,is_primary,guardians(*)").eq("student_id", r.id) : { data: [] }]);
    const md = modal(`<h3>${esc(r.full_name)}</h3><div class="fg">${[["رقم الطالب", r.student_no], ["الحالة الدراسية", L.stu[r.study_status]], ["نوع القيد", L.etype[r.enrollment_type]], ["الجنسية", r.nationality], ["تاريخ الميلاد", fmt(r.birth_date)], ["تاريخ أول قيد", fmt(r.first_enrolled_on)], ...(canContact ? [["الجوال", pv.data?.phone], ["العنوان", pv.data?.address]] : [])].map(([k, v]) => `<div><small class="sub">${k}</small><br><b>${esc(v || "—")}</b></div>`).join("")}</div>
      <h3 class="sec">التسجيل في الأعوام</h3><div class="tw"><table><thead><tr><th>العام</th><th>المرحلة</th><th>الفصل</th><th>الحالة</th></tr></thead><tbody>${(en.data || []).map((e) => `<tr><td>${esc(e.academic_years?.name)}</td><td>${esc(GN[e.grade_code])}</td><td>${esc(SN[e.section_id] || "—")}</td><td>${L.stu[e.status]}</td></tr>`).join("") || '<tr><td colspan="4">—</td></tr>'}</tbody></table></div>
      ${canContact ? `<h3 class="sec">أولياء الأمور</h3>${(gd.data || []).map((g) => `<div class="row2 item"><span>${esc(g.guardians?.full_name)} <small>(${L.rel[g.relation] || ""}${g.is_primary ? "، أساسي" : ""})</small></span><span>${esc(g.guardians?.phone || "")}</span></div>`).join("") || '<p class="sub">لا يوجد.</p>'}` : '<p class="sub">بيانات التواصل مخفية وفق صلاحياتك.</p>'}
      <div class="acts mt"><button class="btn sec" id="h">سجل التغييرات</button><button class="btn sec" id="cx">إغلاق</button></div>`, true);
    md.el.querySelector("#cx").onclick = md.close; md.el.querySelector("#h").onclick = () => showHistory("students", r.id, r.full_name);
  }

  async function form(r) {
    if (!cur || (r ? !canEdit : !canAdd)) return;
    const [pv, gd] = r && canContact ? await Promise.all([sb.from("student_private").select("*").eq("student_id", r.id).maybeSingle(), sb.from("student_guardians").select("relation,guardians(*)").eq("student_id", r.id).eq("is_primary", true).maybeSingle()]) : [{ data: null }, { data: null }];
    const gg = gd.data?.guardians;
    const md = modal(`<h3>${r ? "تعديل متعلم" : "إضافة متعلم"} <small>(${esc(cur.name)})</small></h3><form id="f"><div class="fg">
      <div class="full"><label>الاسم الكامل *</label><input name="full_name" required value="${esc(r?.full_name)}"></div>
      <div><label>رقم الطالب / الهوية</label><input name="student_no" value="${esc(r?.student_no)}"></div><div><label>الجنسية</label><input name="nationality" value="${esc(r?.nationality)}"></div>
      <div><label>تاريخ الميلاد</label><input type="date" name="birth_date" value="${esc(r?.birth_date)}"></div>
      <div><label>نوع القيد</label><select name="enrollment_type">${opts(L.etype, r?.enrollment_type || "new")}</select></div>
      <div><label>المرحلة *</label><select name="grade_code" required>${G.filter((g) => g.is_active || g.code === r?.grade_code).map((g) => `<option value="${g.code}" ${g.code === r?.grade_code ? "selected" : ""}>${esc(g.name_ar)}</option>`).join("")}</select></div>
      <div><label>الفصل</label><select name="section_id"></select></div>
      <div><label>الحالة الدراسية</label><select name="study_status">${opts(L.stu, r?.study_status || "enrolled")}</select></div>
      ${canContact ? `<div><label>جوال المتعلم</label><input name="phone" value="${esc(pv.data?.phone)}"></div><div class="full"><label>العنوان</label><input name="address" value="${esc(pv.data?.address)}"></div>
        <div><label>ولي الأمر</label><input name="g_name" value="${esc(gg?.full_name)}"></div><div><label>الصلة</label><select name="g_rel">${opts(L.rel, gd.data?.relation || "father")}</select></div><div><label>جوال ولي الأمر</label><input name="g_phone" value="${esc(gg?.phone)}"></div>` : ""}
      </div><p class="err" id="fe"></p><div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`, true);
    const f = md.el.querySelector("#f");
    const syncS = () => (f.section_id.innerHTML = '<option value="">—</option>' + S.filter((s) => s.year_id === cur.id && s.grade_code === f.grade_code.value && s.is_active).map((s) => `<option value="${s.id}" ${s.id === r?.section_id ? "selected" : ""}>${esc(s.name)}</option>`).join(""));
    f.grade_code.onchange = syncS; syncS(); md.el.querySelector("#cx").onclick = md.close;
    f.onsubmit = async (e) => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(f)), err = md.el.querySelector("#fe"); err.textContent = "";
      try {
        const base = { full_name: v.full_name.trim(), student_no: nn(v.student_no), nationality: nn(v.nationality), birth_date: nn(v.birth_date), enrollment_type: v.enrollment_type, study_status: v.study_status };
        const id = r?.id || crypto.randomUUID();
        let x = r ? await sb.from("students").update(base).eq("id", id) : await sb.from("students").insert({ ...base, id, created_by: c.uid, first_enrolled_on: today() }); if (x.error) throw x.error;
        const en = { student_id: id, year_id: cur.id, grade_code: v.grade_code, section_id: nn(v.section_id), status: v.study_status };
        x = await sb.from("student_enrollments").upsert(en, { onConflict: "student_id,year_id" }); if (x.error) throw x.error;
        if (canContact) {
          x = await sb.from("student_private").upsert({ student_id: id, phone: nn(v.phone), address: nn(v.address) }, { onConflict: "student_id" }); if (x.error) throw x.error;
          if (nn(v.g_name)) {
            const gid = gg?.id || crypto.randomUUID();
            x = await sb.from("guardians").upsert({ id: gid, full_name: v.g_name.trim(), phone: nn(v.g_phone) }, { onConflict: "id" }); if (x.error) throw x.error;
            x = await sb.from("student_guardians").upsert({ student_id: id, guardian_id: gid, relation: v.g_rel, is_primary: true }, { onConflict: "student_id,guardian_id" }); if (x.error) throw x.error;
          }
        }
      } catch (x) { err.textContent = mapErr(x); return; }
      md.close(); toast("تم الحفظ"); await load(); paint();
    };
  }

  function openImport() {
    const host = m.querySelector("#impbox"), gBy = (s) => G.find((g) => g.name_ar === s || g.code === s);
    importUI(host, {
      registry: "students", label: "المتعلمين",
      fields: [["full_name", "الاسم الكامل *", ["الاسم", "الاسم الكامل"]], ["student_no", "رقم الطالب", ["رقم الطالب", "الهوية", "رقم الهوية"]], ["grade", "المرحلة *", ["المرحلة", "الصف"]], ["section", "الفصل", ["الفصل"]], ["nationality", "الجنسية", ["الجنسية"]], ["birth_date", "تاريخ الميلاد", ["تاريخ الميلاد"]], ["phone", "جوال ولي الأمر", ["جوال ولي الأمر", "الجوال"]]],
      sample: ["اسم المتعلم", "1234567890", "الأول المتوسط", "فصل 1", "سعودي", "2012-05-01", "05xxxxxxxx"],
      prepare: async () => { const r = await sb.from("students").select("id,student_no"); return { st: r.data || [] }; },
      plan: (get, cx, seen) => {
        const errs = [], name = String(get("full_name")).trim(), no = nn(String(get("student_no"))), g = gBy(String(get("grade")).trim()), sn = String(get("section")).trim();
        const sec = g && sn ? S.find((s) => s.year_id === cur.id && s.grade_code === g.code && s.name === sn) : null;
        if (name.length < 2) errs.push("الاسم مطلوب"); if (!g) errs.push("مرحلة غير معروفة"); if (sn && !sec && g) errs.push("فصل غير موجود في هذه المرحلة");
        if (no) { if (seen.has(no)) errs.push("رقم مكرر داخل الملف"); seen.add(no); }
        let bd = get("birth_date"); bd = bd instanceof Date ? bd.toISOString().slice(0, 10) : nn(String(bd)); if (bd && isNaN(Date.parse(bd))) errs.push("تاريخ ميلاد غير صالح");
        const hit = no && cx.st.find((x) => x.student_no === no);
        return { errs, mid: hit?.id, name, rec: { base: { full_name: name, student_no: no, nationality: nn(String(get("nationality"))), birth_date: bd }, en: { grade_code: g?.code, section_id: sec?.id || null }, phone: nn(String(get("phone"))) } };
      },
      create: async (rec, cx, uid) => { const id = crypto.randomUUID(); let x = await sb.from("students").insert({ ...rec.base, id, created_by: uid, first_enrolled_on: today() }); if (x.error) throw x.error; x = await sb.from("student_enrollments").insert({ student_id: id, year_id: cur.id, ...rec.en, status: "enrolled" }); if (x.error) throw x.error; if (rec.phone && canContact) await sb.from("student_private").upsert({ student_id: id, phone: rec.phone }, { onConflict: "student_id" }); return id; },
      update: async (id, rec) => { let x = await sb.from("students").update(rec.base).eq("id", id); if (x.error) throw x.error; x = await sb.from("student_enrollments").upsert({ student_id: id, year_id: cur.id, ...rec.en }, { onConflict: "student_id,year_id" }); if (x.error) throw x.error; },
    }, c, async () => { await load(); paint(); });
  }
  paint();
}, { perm: "students:view" });
