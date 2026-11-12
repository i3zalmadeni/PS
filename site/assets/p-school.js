const PFIELDS = [["official_name", "الاسم الرسمي *"], ["ministry_no", "الرقم الوزاري"], ["stage", "المرحلة الدراسية"], ["school_type", "نوع المدرسة (حكومية، أهلية…)"], ["gender", "للبنين أو البنات", "gender"],
  ["education_department", "الإدارة التعليمية"], ["education_office", "مكتب التعليم"], ["region", "المنطقة"], ["city", "المدينة"], ["district", "الحي"], ["address", "العنوان"], ["latitude", "خط العرض", "num"], ["longitude", "خط الطول", "num"],
  ["phone", "الهاتف"], ["email", "البريد الإلكتروني"], ["website", "الموقع الإلكتروني"], ["declared_capacity", "الطاقة الاستيعابية المعلنة (اتركها فارغة للحساب التلقائي)", "num"], ["notes", "ملاحظات", "area"], ["publish_public", "نشر ملخص المدرسة على الموقع العام (الأعداد والمرافق وبيانات المدرسة، دون أي بيانات شخصية)", "bool"]];

boot("school.html", async (m, c) => {
  const canPub = c.can("publish:manage"), canEdit = c.can("school:edit"), canCls = c.can("students:edit");
  let P = {}, years = [], lead = [], grades = [], sections = [], stats = [], staff = [], tab = location.hash === "#years" ? "years" : "profile";
  async function load() {
    const [a, b, d, e, f, g, h] = await Promise.all([sb.from("school_profile").select("*").maybeSingle(), sb.from("academic_years").select("*").order("created_at", { ascending: false }),
      sb.from("school_leadership").select("*,staff_members(full_name)").order("started_on", { ascending: false }), sb.from("grade_levels").select("*").order("sort_order"),
      sb.from("class_sections").select("*").order("name"), sb.from("school_year_stats").select("*,academic_years(name)").order("recorded_at", { ascending: false }), sb.from("staff_members").select("id,full_name").eq("is_active", true).order("full_name")]);
    P = a.data || {}; years = b.data || []; lead = d.data || []; grades = e.data || []; sections = f.data || []; stats = g.data || []; staff = h.data || [];
  }
  await load();
  const cur = () => years.find((y) => y.status === "current");
  const TABS = [["profile", "بيانات المدرسة"], ["lead", "القيادة المدرسية"], ["years", "الأعوام الدراسية"], ["classes", "المراحل والفصول"]];
  function paint() {
    m.innerHTML = head("المدرسة", "الملف المعلوماتي المركزي للمدرسة") + `<div class="tabs">${TABS.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${n}</button>`).join("")}</div><div id="body"></div>`;
    m.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => { tab = b.dataset.t; paint(); }));
    ({ profile, lead: leadership, years: yearsTab, classes })[tab](m.querySelector("#body"));
  }
  const rerun = async () => { await load(); paint(); };

  function profile(b) {
    const fld = ([k, l, t]) => t === "bool" ? `<div class="full"><label class="chk"><input type="checkbox" name="${k}" ${P[k] !== false ? "checked" : ""} ${canEdit && canPub ? "" : "disabled"} style="width:auto"> ${esc(l)}${canPub ? "" : " <small class='sub'>(من اختصاص مدير النواة أو منسق البوابة)</small>"}</label></div>` : `<div class="${t === "area" ? "full" : ""}"><label>${esc(l)}</label>${t === "gender" ? `<select name="${k}" ${canEdit ? "" : "disabled"}><option value="">—</option>${opts(L.gender, P[k])}</select>` : t === "area" ? `<textarea name="${k}" ${canEdit ? "" : "disabled"}>${esc(P[k])}</textarea>` : `<input name="${k}" ${t === "num" ? 'type="number" step="any"' : ""} value="${esc(P[k])}" ${canEdit ? "" : "disabled"}>`}</div>`;
    b.innerHTML = `<form id="pf" class="card"><div class="fg">${PFIELDS.map(fld).join("")}</div><p class="err" id="fe"></p><div class="acts mt">${canEdit ? '<button class="btn">حفظ</button>' : ""}<button type="button" class="btn sec" id="hs">سجل التغييرات</button><button type="button" class="btn sec" id="ex">تصدير Excel</button></div></form>`;
    b.querySelector("#hs").onclick = () => showHistory("school_profile", null, "بيانات المدرسة");
    b.querySelector("#ex").onclick = () => exportXlsx("سجل-المدرسة", PFIELDS.filter((f) => f[2] !== "bool").map((f) => f[1].replace(" *", "")), [PFIELDS.filter((f) => f[2] !== "bool").map((f) => P[f[0]] ?? "")]);
    if (!canEdit) return;
    b.querySelector("#pf").onsubmit = async (e) => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)), patch = { updated_by: c.uid };
      PFIELDS.forEach(([k, , t]) => { if (t === "bool" && !canPub) return; patch[k] = t === "bool" ? e.target[k].checked : t === "num" ? num(v[k]) : nn(v[k]); });
      if (!patch.official_name) { b.querySelector("#fe").textContent = "الاسم الرسمي مطلوب"; return; }
      const r = await sb.from("school_profile").update(patch).eq("id", true); if (r.error) { b.querySelector("#fe").textContent = mapErr(r.error); return; }
      toast("تم الحفظ"); await load();
    };
  }

  function leadership(b) {
    b.innerHTML = `${canEdit ? '<div class="acts"><button class="btn" id="ad">إضافة قيادي</button></div>' : ""}<div class="tw mt"><table><thead><tr><th>الاسم</th><th>المنصب</th><th>من</th><th>إلى</th><th></th></tr></thead><tbody>${lead.map((l) =>
      `<tr><td>${esc(l.staff_members?.full_name)}</td><td>${esc(l.position)}</td><td>${fmt(l.started_on)}</td><td>${l.ended_on ? fmt(l.ended_on) : '<span class="badge ok">قائم</span>'}</td><td>${canEdit && !l.ended_on ? `<button class="btn sm sec" data-e="${l.id}">إنهاء</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="5">لم تُسجَّل القيادة بعد.</td></tr>'}</tbody></table></div>
      <p class="sub">القيادة مرتبطة بالمنسوبين بالمعرّف الثابت، فلا تتكرر البيانات.</p>`;
    b.querySelectorAll("[data-e]").forEach((x) => (x.onclick = async () => { await sb.from("school_leadership").update({ ended_on: today() }).eq("id", x.dataset.e); rerun(); }));
    if (!canEdit) return;
    b.querySelector("#ad").onclick = () => {
      const md = modal(`<h3>إضافة قيادي</h3><form id="f"><label>المنسوب</label><select name="staff_id" required>${staff.map((s) => `<option value="${s.id}">${esc(s.full_name)}</option>`).join("")}</select><label>المنصب</label><input name="position" list="pos" required><datalist id="pos"><option>مدير المدرسة</option><option>وكيل الشؤون التعليمية</option><option>وكيل شؤون الطلاب</option><option>وكيل الشؤون المدرسية</option></datalist>
        <label>تاريخ البداية</label><input type="date" name="started_on" value="${today()}"><p class="err" id="fe"></p><div class="acts mt"><button class="btn">إضافة</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
      md.el.querySelector("#cx").onclick = md.close;
      md.el.querySelector("#f").onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); const r = await sb.from("school_leadership").insert({ staff_id: v.staff_id, position: v.position.trim(), started_on: v.started_on || today() }); if (r.error) { md.el.querySelector("#fe").textContent = mapErr(r.error); return; } md.close(); rerun(); };
    };
  }

  function yearsTab(b) {
    const y = cur();
    b.innerHTML = `<div class="alert" style="background:var(--c1b);color:var(--c1f)">كل عام دراسي دورة مستقلة: ينتقل المتعلمون والفصول والمنسوبون إلى العام الجديد دون حذف أي بيان، ويُجمَّد العام المنتهي ويُحفظ ملخصه الإحصائي.</div>
      <div class="acts">${c.isAdmin ? (y ? '<button class="btn gold" id="ro">بدء عام دراسي جديد</button>' : '<button class="btn" id="first">إنشاء العام الدراسي الأول</button>') + '<button class="btn sec" id="past">إضافة عام سابق (بيانات تاريخية)</button>' : ""}${y && canEdit ? '<button class="btn sec" id="snap">تحديث ملخص العام الحالي</button>' : ""}<button class="btn sec" id="ex">تصدير الإحصاءات</button></div>
      <h3 class="sec">الأعوام الدراسية</h3><div class="tw"><table><thead><tr><th>العام</th><th>الحالة</th><th>البداية</th><th>النهاية</th></tr></thead><tbody>${years.map((x) => `<tr><td>${esc(x.name)}</td><td><span class="badge ${x.status === "current" ? "ok" : ""}">${L.year[x.status]}</span></td><td>${fmt(x.starts_on)}</td><td>${fmt(x.ends_on)}</td></tr>`).join("") || '<tr><td colspan="4">لا توجد أعوام بعد.</td></tr>'}</tbody></table></div>
      <h3 class="sec">الإحصاءات حسب العام</h3><div class="tw"><table><thead><tr><th>العام</th><th>المصدر</th><th>المنسوبون</th><th>المتعلمون</th><th>الفصول</th><th>المرافق</th><th>الطاقة</th><th></th></tr></thead><tbody>${stats.map((s) => `<tr><td>${esc(s.academic_years?.name)}</td><td>${s.source === "snapshot" ? "تلقائي" : "يدوي"}</td><td>${s.personnel_count ?? "—"}</td><td>${s.students_count ?? "—"}</td><td>${s.classes_count ?? "—"}</td><td>${s.facilities_count ?? "—"}</td><td>${s.capacity ?? "—"}</td><td>${canEdit && s.source === "manual" ? `<button class="btn sm sec" data-m="${s.year_id}">تعديل</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="8">لا توجد إحصاءات محفوظة. تُحفظ تلقائياً عند إغلاق كل عام.</td></tr>'}</tbody></table></div>`;
    b.querySelector("#ex").onclick = () => exportXlsx("إحصاءات-الأعوام", ["العام", "المنسوبون", "المتعلمون", "الفصول", "المرافق", "الطاقة"], stats.map((s) => [s.academic_years?.name, s.personnel_count, s.students_count, s.classes_count, s.facilities_count, s.capacity]));
    const yform = (title, closed) => {
      const md = modal(`<h3>${title}</h3><form id="f"><label>اسم العام (مثل 1448/1449هـ)</label><input name="name" required><div class="fg"><div><label>بداية العام</label><input type="date" name="starts_on"></div><div><label>نهاية العام</label><input type="date" name="ends_on"></div></div><p class="err" id="fe"></p><div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
      md.el.querySelector("#cx").onclick = md.close;
      md.el.querySelector("#f").onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); const r = await sb.from("academic_years").insert({ name: v.name.trim(), starts_on: nn(v.starts_on), ends_on: nn(v.ends_on), status: closed ? "closed" : "current", closed_at: closed ? new Date().toISOString() : null }); if (r.error) { md.el.querySelector("#fe").textContent = mapErr(r.error); return; } md.close(); rerun(); };
    };
    if (b.querySelector("#first")) b.querySelector("#first").onclick = () => yform("إنشاء العام الدراسي الأول (يصبح العام الحالي)", false);
    if (b.querySelector("#past")) b.querySelector("#past").onclick = () => yform("إضافة عام سابق مغلق لتسجيل بياناته التاريخية", true);
    if (b.querySelector("#snap")) b.querySelector("#snap").onclick = async () => { const r = await sb.rpc("snapshot_year_stats", { p_year: y.id }); r.error ? toast(mapErr(r.error), true) : (toast("حُدّث ملخص العام"), rerun()); };
    if (b.querySelector("#ro")) b.querySelector("#ro").onclick = async () => {
      const pv = await sb.rpc("preview_year_rollover"); if (pv.error) { toast(mapErr(pv.error), true); return; } const d = pv.data;
      const md = modal(`<h3>بدء عام دراسي جديد</h3><p>سيُغلق العام <b>${esc(d.current_year)}</b> ويُحفظ ملخصه، دون حذف أي بيان. سيحدث الآتي:</p>
        <div class="grid"><div class="card stat"><b>${d.students_to_promote}</b><span>متعلم يُرقَّى للصف التالي</span></div><div class="card stat"><b>${d.students_to_graduate}</b><span>متعلم يتخرج</span></div><div class="card stat"><b>${d.sections_to_copy}</b><span>فصل يُنسخ للعام الجديد</span></div><div class="card stat"><b>${d.staff_to_carry}</b><span>منسوب يُنقل لكشف العام</span></div></div>
        <p class="sub">يُسجَّل المرقَّون بلا فصل حتى تُوزّعهم، ويمكن تعديل صف أي متعلم راسب بعد البدء. العام المغلق لا يعدّله إلا مدير النواة.</p>
        <form id="f"><label>اسم العام الجديد</label><input name="name" required><div class="fg"><div><label>بداية العام</label><input type="date" name="starts_on"></div><div><label>نهاية العام</label><input type="date" name="ends_on"></div></div><p class="err" id="fe"></p><div class="acts mt"><button class="btn gold">تأكيد وبدء العام</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
      md.el.querySelector("#cx").onclick = md.close;
      md.el.querySelector("#f").onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); const r = await sb.rpc("rollover_academic_year", { p_name: v.name, p_starts: nn(v.starts_on), p_ends: nn(v.ends_on) }); if (r.error) { md.el.querySelector("#fe").textContent = mapErr(r.error); return; } md.close(); toast("بدأ العام الدراسي الجديد"); rerun(); };
    };
    b.querySelectorAll("[data-m]").forEach((x) => (x.onclick = () => manual(x.dataset.m)));
    if (canEdit) { const cl = years.filter((z) => z.status === "closed" && !stats.some((s) => s.year_id === z.id)); if (cl.length) b.insertAdjacentHTML("beforeend", `<div class="acts mt">${cl.map((z) => `<button class="btn sm sec" data-m="${z.id}">تسجيل إحصاءات ${esc(z.name)}</button>`).join("")}</div>`), b.querySelectorAll("[data-m]").forEach((x) => (x.onclick = () => manual(x.dataset.m))); }
  }
  function manual(yid) {
    const s = stats.find((x) => x.year_id === yid) || {}, K = [["personnel_count", "المنسوبون"], ["students_count", "المتعلمون"], ["classes_count", "الفصول"], ["facilities_count", "المرافق"], ["capacity", "الطاقة الاستيعابية"]];
    const md = modal(`<h3>إحصاءات تاريخية: ${esc(years.find((z) => z.id === yid)?.name)}</h3><form id="f"><div class="fg">${K.map(([k, l]) => `<div><label>${l}</label><input type="number" min="0" name="${k}" value="${esc(s[k])}"></div>`).join("")}<div class="full"><label>ملاحظة</label><input name="note" value="${esc(s.note)}"></div></div><p class="err" id="fe"></p><div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
    md.el.querySelector("#cx").onclick = md.close;
    md.el.querySelector("#f").onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)), rec = { year_id: yid, source: "manual", note: nn(v.note), recorded_by: c.uid, recorded_at: new Date().toISOString() }; K.forEach(([k]) => (rec[k] = num(v[k])));
      const r = await sb.from("school_year_stats").upsert(rec, { onConflict: "year_id" }); if (r.error) { md.el.querySelector("#fe").textContent = mapErr(r.error); return; } md.close(); rerun(); };
  }

  function classes(b) {
    const y = cur();
    if (!y) { b.innerHTML = '<div class="alert">أنشئ العام الدراسي الحالي أولاً من تبويب «الأعوام الدراسية»، فالفصول تُدار لكل عام.</div>'; return; }
    const secs = sections.filter((s) => s.year_id === y.id);
    b.innerHTML = `<p class="sub">المراحل أولاً، ثم الفصول تحت كل مرحلة للعام <b>${esc(y.name)}</b>. تُنسخ الفصول تلقائياً عند بدء العام التالي.</p>${canCls ? '<div class="acts"><button class="btn" id="ag">إضافة مرحلة</button></div>' : ""}
      ${grades.map((g) => { const ss = secs.filter((s) => s.grade_code === g.code); return `<div class="card mt"><div class="row2"><div><b>${esc(g.name_ar)}</b> ${g.is_active ? "" : '<span class="badge">موقوفة</span>'} <span class="badge">${ss.filter((s) => s.is_active).length} فصل</span></div>${canCls ? `<div class="acts"><button class="btn sm" data-ac="${g.code}">إضافة فصل</button><button class="btn sm sec" data-eg="${g.code}">تعديل المرحلة</button></div>` : ""}</div>
        ${ss.map((s) => `<div class="row2 item mt"><span>${esc(s.name)} ${s.capacity ? `<small>· سعة ${s.capacity}</small>` : ""} ${s.is_active ? "" : '<span class="badge">موقوف</span>'}</span>${canCls ? `<button class="btn sm sec" data-ts="${s.id}">${s.is_active ? "إيقاف" : "تفعيل"}</button>` : ""}</div>`).join("") || '<p class="sub">لا توجد فصول بعد.</p>'}</div>`; }).join("")}`;
    if (!canCls) return;
    const ask = (title, fields, fn) => { const md = modal(`<h3>${title}</h3><form id="f">${fields}<p class="err" id="fe"></p><div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`); md.el.querySelector("#cx").onclick = md.close; md.el.querySelector("#f").onsubmit = async (e) => { e.preventDefault(); const r = await fn(Object.fromEntries(new FormData(e.target))); if (r.error) { md.el.querySelector("#fe").textContent = mapErr(r.error); return; } md.close(); rerun(); }; };
    b.querySelector("#ag").onclick = () => ask("إضافة مرحلة", '<label>اسم المرحلة (مثل: الأول المتوسط)</label><input name="name_ar" required>', (v) => sb.from("grade_levels").insert({ code: "g" + Math.random().toString(36).slice(2, 7), name_ar: v.name_ar.trim(), sort_order: (grades.at(-1)?.sort_order || 0) + 1 }));
    b.querySelectorAll("[data-ac]").forEach((x) => (x.onclick = () => ask("إضافة فصل", '<label>اسم الفصل (مثل: فصل 1)</label><input name="name" required><label>السعة (اختياري)</label><input type="number" min="0" name="capacity">', (v) => sb.from("class_sections").insert({ year_id: y.id, grade_code: x.dataset.ac, name: v.name.trim(), capacity: num(v.capacity) }))));
    b.querySelectorAll("[data-eg]").forEach((x) => { const g = grades.find((z) => z.code === x.dataset.eg); x.onclick = () => ask("تعديل المرحلة", `<label>الاسم</label><input name="name_ar" required value="${esc(g.name_ar)}"><label>الترتيب</label><input type="number" name="sort_order" value="${g.sort_order}"><label>الحالة</label><select name="is_active"><option value="true" ${g.is_active ? "selected" : ""}>نشطة</option><option value="false" ${g.is_active ? "" : "selected"}>موقوفة</option></select>`, (v) => sb.from("grade_levels").update({ name_ar: v.name_ar.trim(), sort_order: Number(v.sort_order), is_active: v.is_active === "true" }).eq("code", g.code)); });
    b.querySelectorAll("[data-ts]").forEach((x) => (x.onclick = async () => { const s = sections.find((z) => z.id === x.dataset.ts); const r = await sb.from("class_sections").update({ is_active: !s.is_active }).eq("id", s.id); r.error ? toast(mapErr(r.error), true) : rerun(); }));
  }
  paint();
});
