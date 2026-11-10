const FIELDS = [["full_name", "الاسم الكامل *", ["الاسم", "الاسم الكامل", "name"]], ["employee_no", "الرقم الوظيفي", ["الرقم الوظيفي", "رقم وظيفي", "employee"]],
  ["category", "الفئة الوظيفية", ["الفئة", "الفئة الوظيفية", "category"]], ["job_title", "المسمى الوظيفي", ["المسمى", "المسمى الوظيفي", "الوظيفة"]],
  ["specialty", "التخصص", ["التخصص", "specialty"]], ["qualification", "المؤهل", ["المؤهل", "المؤهل العلمي"]], ["email", "البريد الإلكتروني", ["البريد", "البريد الإلكتروني", "email"]],
  ["phone", "الجوال", ["الجوال", "رقم التواصل", "phone"]], ["stage", "المرحلة", ["المرحلة"]], ["subjects", "المواد", ["المواد", "المادة"]], ["grades", "الصفوف", ["الصفوف"]], ["joined_on", "تاريخ الانضمام", ["تاريخ الانضمام"]]];

boot("import.html", async (m, c) => {
  const [cats, titles] = await Promise.all([sb.from("staff_categories").select("*"), sb.from("job_titles").select("*")]);
  const C = cats.data || [], T = titles.data || [];
  m.innerHTML = head("استيراد المنسوبين من Excel", "معاينة ومطابقة وفحص التكرار قبل التنفيذ، مع سجل وإمكانية التراجع") +
    `<div class="card"><div class="acts"><button class="btn sec" id="tpl">تنزيل القالب</button><input type="file" id="fl" accept=".xlsx,.xls,.csv" style="width:auto"></div>
     <div id="map" class="mt"></div><div id="prev" class="mt"></div></div><h3 class="sec">سجل عمليات الاستيراد</h3><div id="jobs"></div>`;
  const nrm = (s) => String(s ?? "").trim();
  document.getElementById("tpl").onclick = () => {
    const ws = XLSX.utils.aoa_to_sheet([FIELDS.map((f) => f[1].replace(" *", "")), ["أحمد بن سعد المطيري", "12345", "الهيئة التعليمية", "معلم", "الرياضيات", "بكالوريوس", "name@example.com", "0500000000", "المرحلة المتوسطة", "الرياضيات", "الأول المتوسط، الثاني المتوسط", "2024-09-01"]]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "المنسوبون"); XLSX.writeFile(wb, "قالب-المنسوبين.xlsx");
  };
  let data = [], cols = [], plan = null, fname = "";
  document.getElementById("fl").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return; fname = f.name;
    if (f.size > 5 * 1024 * 1024) { toast("الملف أكبر من 5 ميجابايت", true); return; }
    const wb = XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: true });
    data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }); cols = data.length ? Object.keys(data[0]) : [];
    if (!data.length) { toast("الملف فارغ", true); return; }
    document.getElementById("map").innerHTML = `<h3 class="sec">مطابقة الأعمدة (${data.length} صف)</h3><div class="fg">${FIELDS.map(([k, l, syn]) => {
      const g = cols.find((x) => syn.some((s) => nrm(x) === s));
      return `<div><label>${esc(l)}</label><select data-f="${k}"><option value="">—</option>${cols.map((x) => `<option ${x === g ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>`;
    }).join("")}</div><div class="acts mt"><button class="btn" id="pv">معاينة وفحص</button></div>`;
    document.getElementById("pv").onclick = preview; document.getElementById("prev").innerHTML = "";
  };
  const dateOf = (v) => { if (!v) return null; if (v instanceof Date) return v.toISOString().slice(0, 10); const s = nrm(v); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "bad"; };
  const split = (s) => nrm(s).split(/[،,;]/).map((x) => x.trim()).filter(Boolean);
  async function preview() {
    const map = Object.fromEntries([...document.querySelectorAll("[data-f]")].map((s) => [s.dataset.f, s.value]));
    if (!map.full_name) { toast("حدد عمود الاسم", true); return; }
    const [{ data: ex }, { data: sm }] = await Promise.all([sb.from("staff_private").select("staff_id,employee_no,email"), sb.from("staff_members").select("id,category,job_title")]);
    const byNo = new Map(), byEm = new Map(); (ex || []).forEach((x) => { if (x.employee_no) byNo.set(x.employee_no, x.staff_id); if (x.email) byEm.set(x.email.toLowerCase(), x.staff_id); });
    const catOf = (s) => { s = nrm(s); return (C.find((x) => x.code === s || x.name_ar === s || x.name_ar.includes(s) && s.length > 2) || {}).code; };
    const jobOf = (s) => (T.find((x) => x.code === s || x.name_ar === nrm(s)) || {}).code;
    const seenNo = new Set(), seenEm = new Set(); plan = [];
    data.forEach((r, i) => {
      const g = (k) => (map[k] ? r[map[k]] : ""), errs = [];
      const name = nrm(g("full_name")); if (name.length < 2) errs.push("الاسم مطلوب");
      let cat = nrm(g("category")) ? catOf(g("category")) : null, job = nrm(g("job_title")) ? jobOf(g("job_title")) : null;
      if (nrm(g("category")) && !cat) errs.push("فئة غير معروفة");
      if (nrm(g("job_title")) && !job) errs.push("مسمى وظيفي غير معروف");
      if (!cat && job) cat = (T.find((x) => x.code === job) || {}).category;
      if (!cat && !errs.length) { cat = "teaching"; if (!job) job = "teacher"; }
      if (cat && !job) job = cat === "teaching" ? "teacher" : null;
      if (cat && !job) errs.push("المسمى الوظيفي مطلوب");
      if (cat && job && (T.find((x) => x.code === job) || {}).category !== cat) errs.push("المسمى لا يتبع الفئة");
      const no = nrm(g("employee_no")) || null, em = nrm(g("email")).toLowerCase() || null;
      if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) errs.push("بريد غير صالح");
      const jd = dateOf(g("joined_on")); if (jd === "bad") errs.push("تاريخ غير صالح (yyyy-mm-dd)");
      let dup = null; if (no && seenNo.has(no)) dup = "مكرر داخل الملف"; if (em && seenEm.has(em)) dup = "مكرر داخل الملف"; if (dup) errs.push(dup);
      if (no) seenNo.add(no); if (em) seenEm.add(em);
      const mid = (no && byNo.get(no)) || (em && byEm.get(em)) || null;
      plan.push({ i: i + 2, name, errs, mid, rec: { full_name: name, category: cat, job_title: job, specialty: nrm(g("specialty")) || null, qualification: nrm(g("qualification")) || null, joined_on: jd, employee_no: no, email: em, phone: nrm(g("phone")) || null, stage: nrm(g("stage")) || null, subjects: split(g("subjects")), grades: split(g("grades")) } });
    });
    const ok = plan.filter((p) => !p.errs.length), nw = ok.filter((p) => !p.mid).length, up = ok.length - nw, bad = plan.length - ok.length;
    document.getElementById("prev").innerHTML = `<h3 class="sec">نتيجة الفحص</h3><div class="grid"><div class="card stat"><b>${nw}</b><span>جديد</span></div><div class="card stat"><b>${up}</b><span>تحديث لسجل قائم</span></div><div class="card stat"><b>${bad}</b><span>أخطاء (لن تُستورد)</span></div></div>
      ${bad ? `<div class="tw mt"><table><thead><tr><th>الصف</th><th>الاسم</th><th>الخطأ</th></tr></thead><tbody>${plan.filter((p) => p.errs.length).map((p) => `<tr><td>${p.i}</td><td>${esc(p.name)}</td><td class="err">${esc(p.errs.join("، "))}</td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="acts mt"><button class="btn" id="go" ${ok.length ? "" : "disabled"}>استيراد الصحيح فقط (${ok.length})</button></div>`;
    document.getElementById("go").onclick = () => run(ok);
  }
  async function run(ok) {
    const btn = document.getElementById("go"); btn.disabled = true; btn.textContent = "جارٍ الاستيراد…";
    const created = [], errors = []; let upd = 0;
    for (const p of ok.filter((x) => !x.mid)) {
      const id = crypto.randomUUID(), r = p.rec;
      const a = await sb.from("staff_members").insert({ id, full_name: r.full_name, category: r.category, job_title: r.job_title, specialty: r.specialty, qualification: r.qualification, joined_on: r.joined_on || today(), source_type: "excel_import", created_by: c.uid });
      if (a.error) { errors.push({ row: p.i, error: mapErr(a.error) }); continue; }
      created.push(id);
      const b = await sb.from("staff_private").upsert({ staff_id: id, employee_no: r.employee_no, email: r.email, phone: r.phone }, { onConflict: "staff_id" });
      if (b.error) errors.push({ row: p.i, error: mapErr(b.error) });
      if (r.category === "teaching" && (r.stage || r.subjects.length || r.grades.length)) await sb.from("staff_teaching").upsert({ staff_id: id, stage: r.stage, subjects: r.subjects, grades: r.grades }, { onConflict: "staff_id" });
    }
    for (const p of ok.filter((x) => x.mid)) {
      const r = p.rec, patch = {}; ["full_name", "category", "job_title", "specialty", "qualification", "joined_on"].forEach((k) => { if (r[k]) patch[k] = r[k]; });
      const a = await sb.from("staff_members").update(patch).eq("id", p.mid);
      if (a.error) { errors.push({ row: p.i, error: mapErr(a.error) }); continue; }
      const pv = {}; ["employee_no", "email", "phone"].forEach((k) => { if (r[k]) pv[k] = r[k]; });
      if (Object.keys(pv).length) { const b = await sb.from("staff_private").upsert({ staff_id: p.mid, ...pv }, { onConflict: "staff_id" }); if (b.error) { errors.push({ row: p.i, error: mapErr(b.error) }); continue; } }
      upd++;
    }
    const skipped = plan.length - ok.length + errors.length;
    await sb.from("import_jobs").insert({ file_name: fname, status: errors.length && !created.length && !upd ? "failed" : "completed", total_rows: plan.length, created_count: created.length, updated_count: upd, skipped_count: skipped, error_report: [...plan.filter((p) => p.errs.length).map((p) => ({ row: p.i, error: p.errs.join("، ") })), ...errors], created_ids: created, created_by: c.uid });
    toast(`أُنشئ ${created.length} وحُدّث ${upd} وتُجوهل ${skipped}`); document.getElementById("map").innerHTML = ""; document.getElementById("prev").innerHTML = ""; document.getElementById("fl").value = ""; jobs();
  }
  async function jobs() {
    const { data } = await sb.from("import_jobs").select("*").order("created_at", { ascending: false }).limit(20);
    document.getElementById("jobs").innerHTML = `<div class="tw"><table><thead><tr><th>الملف</th><th>التاريخ</th><th>جديد</th><th>محدَّث</th><th>متجاهَل</th><th>الحالة</th><th></th></tr></thead><tbody>${(data || []).map((j) =>
      `<tr><td>${esc(j.file_name)}</td><td>${fmt(j.created_at)}</td><td>${j.created_count}</td><td>${j.updated_count}</td><td>${j.skipped_count}</td><td>${({ completed: "منفَّذ", failed: "فشل", rolled_back: "تم التراجع" })[j.status]}</td>
      <td>${j.status === "completed" && j.created_ids.length ? `<button class="btn sm bad" data-rb="${j.id}">تراجع عن المضاف</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="7">لا توجد عمليات.</td></tr>'}</tbody></table></div>
      <p class="sub">التراجع يحذف المنسوبين المضافين بهذه العملية فقط، ولا يعيد تعديلات السجلات المحدَّثة. يُرفض إن كان لأحدهم عضوية في فريق.</p>`;
    document.querySelectorAll("[data-rb]").forEach((b) => (b.onclick = async () => {
      if (!confirm("حذف المنسوبين المضافين بهذه العملية؟")) return;
      const j = data.find((x) => x.id === b.dataset.rb); const d = await sb.from("staff_members").delete().in("id", j.created_ids);
      if (d.error) { toast("تعذر التراجع: " + mapErr(d.error), true); return; }
      await sb.from("import_jobs").update({ status: "rolled_back", rolled_back_at: new Date().toISOString() }).eq("id", j.id); toast("تم التراجع"); jobs();
    }));
  }
  jobs();
}, { admin: true });
