const CAT_AR = { teaching: "الهيئة التعليمية", administrative: "الهيئة الإدارية", support: "الهيئة المساندة" };
const IC = {
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c1.9.7 3.2 2.3 3.5 5.2"/></svg>',
  cap: '<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>',
  building: '<svg viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M16 9h2a2 2 0 012 2v10M2 21h20M8 7h4M8 11h4M8 15h4"/></svg>',
  seat: '<svg viewBox="0 0 24 24"><path d="M5 11V8a3 3 0 013-3h8a3 3 0 013 3v3M3 14a2 2 0 014 0v2h10v-2a2 2 0 014 0v4H3zM6 18v2M18 18v2"/></svg>',
  school: '<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v10M19 10v10M2 20h20M9 20v-6h6v6"/></svg>',
};
boot("dashboard.html", async (m, c) => {
  const [st, sc, gr, ft] = await Promise.all([sb.rpc("school_stats"), sb.from("school_profile").select("*").maybeSingle(), sb.from("grade_levels").select("code,name_ar").order("sort_order"), sb.from("facility_types").select("code,name_ar")]);
  const s = st.data || {}, p = sc.data || {}, G = Object.fromEntries((gr.data || []).map((x) => [x.code, x.name_ar])), FT = Object.fromEntries((ft.data || []).map((x) => [x.code, x.name_ar]));
  const lst = (o, names) => { const e = Object.entries(o || {}), mx = Math.max(1, ...e.map(([, v]) => v)); return e.map(([k, v]) => `<div class="row3"><span>${esc(names[k] || k)}</span><b>${v}</b><div class="track"><i style="width:${Math.round((v / mx) * 100)}%"></i></div></div>`).join("") || '<span class="sub">لا توجد بيانات بعد.</span>'; };
  const kpi = (n, v, t, i) => `<div class="kpi k${i}"><div class="ic">${n}</div><div><b>${v ?? 0}</b><span>${t}</span></div></div>`;
  const reg = (href, ic, tone, t, d) => `<a class="card reg" href="${href}"><div class="ic k${tone}">${ic}</div><div><b>${t}</b><small>${d}</small></div></a>`;
  const yearChip = s.current_year ? `<span class="yr"><i></i>العام الدراسي: ${esc(s.current_year)}</span>` : c.isAdmin ? '<a class="yr" href="school.html#years">إنشاء العام الدراسي الأول ←</a>' : '<span class="yr">لا يوجد عام دراسي حالي</span>';
  m.innerHTML = `<section class="dash-hero"><div><h2>${esc(p.official_name || "النواة الرقمية")}</h2><p>لوحة تحكم النواة: ملخص السجلات الأربعة، وكلها محسوبة تلقائياً</p></div>${yearChip}</section>
    <div class="grid">${kpi(IC.users, s.personnel_total, "إجمالي المنسوبين", 0)}${kpi(IC.cap, s.students_total, "المتعلمون المنتظمون", 1)}${kpi(IC.grid, s.classes_total, "الفصول الدراسية", 2)}${kpi(IC.building, s.facilities_total, "المرافق", 3)}${kpi(IC.seat, s.capacity, "الطاقة الاستيعابية", 4)}</div>
    <h3 class="sec">إحصاءات أساسية</h3><div class="grid">
      <div class="card brk"><b>المنسوبون حسب الفئة</b>${lst(s.personnel_by_category, CAT_AR)}</div>
      <div class="card brk"><b>المتعلمون حسب المرحلة</b>${lst(s.students_by_grade, G)}</div>
      <div class="card brk"><b>الفصول حسب المرحلة</b>${lst(s.classes_by_grade, G)}</div>
      <div class="card brk"><b>المرافق حسب النوع</b>${lst(s.facilities_by_type, FT)}</div></div>
    <h3 class="sec">بيانات المدرسة</h3><div class="card"><div class="fg">
      ${[["الرقم الوزاري", p.ministry_no], ["المرحلة", p.stage], ["نوع المدرسة", [p.school_type, L.gender[p.gender]].filter(Boolean).join(" · ")], ["الإدارة التعليمية", p.education_department], ["مكتب التعليم", p.education_office], ["الموقع", [p.city, p.district].filter(Boolean).join("، ")]].map(([k, v]) => `<div><small class="sub">${k}</small><br><b>${esc(v || "—")}</b></div>`).join("")}</div></div>
    <h3 class="sec">السجلات الأربعة</h3><div class="grid">
      ${reg("school.html", IC.school, 0, "المدرسة", "الملف المركزي والقيادة والأعوام والمراحل والفصول.")}
      ${reg("staff.html", IC.users, 3, "المنسوبون", "الهيئة التعليمية والإدارية والمساندة.")}
      ${c.can("students:view") ? reg("students.html", IC.cap, 1, "المتعلمون", "الهوية والتسجيل لكل عام وأولياء الأمور.") : ""}
      ${reg("facilities.html", IC.building, 4, "المرافق", "الهوية الثابتة والموقع والمسؤولون والتجهيزات.")}</div>`;
  if (c.can("publish:manage")) { const host = document.createElement("div"); host.id = "pubpanel"; m.appendChild(host); publishPanel(host); }
});

// النشر في الموقع العام (لمدير النواة ومنسق البوابة): المفتاح العام للمدرسة + نشر المنسوبين فرداً أو جماعياً
async function publishPanel(host) {
  let P = {}, rows = [], q = "", flt = "all"; const sel = new Set();
  const load = async () => {
    const [a, b] = await Promise.all([sb.from("school_profile").select("publish_public").maybeSingle(),
      sb.from("staff_members").select("id,full_name,specialty,photo_path,public_photo_path,publish_public,job_titles(name_ar)").eq("is_active", true).order("full_name")]);
    P = a.data || {}; rows = b.data || [];
  };
  const vis = () => rows.filter((r) => (!q || r.full_name.includes(q) || (r.specialty || "").includes(q)) && (flt === "all" || (flt === "pub" ? r.publish_public : !r.publish_public)));
  function draw() {
    const pub = rows.filter((r) => r.publish_public).length, V = vis(), on = !!P.publish_public;
    host.innerHTML = `<h3 class="sec">النشر في الموقع العام</h3><div class="card">
      <div class="bar"><div><b>المفتاح العام للمدرسة:</b> <span class="badge ${on ? "ok" : ""}">${on ? "مفعّل" : "متوقف"}</span><br><small class="sub">${on ? "الموقع العام يعرض ملخص المدرسة والمنسوبين المنشورين." : "لن يظهر أي منسوب ولا ملخص المدرسة في الموقع العام حتى تفعّل هذا المفتاح."}</small></div>
        <button class="btn ${on ? "sec" : ""}" id="pg" style="flex:0 0 auto">${on ? "إيقاف النشر العام" : "تفعيل النشر العام"}</button></div>
      <p class="sub">منشور من المنسوبين: <b>${pub}</b> من <b>${rows.length}</b> منسوباً على رأس العمل. لا يظهر في الموقع إلا من فُعّل نشره هنا (الاسم والصورة والوظيفة والتخصص فقط).</p>
      <div class="bar"><input id="pq" placeholder="بحث بالاسم أو التخصص" value="${esc(q)}"><select id="pf"><option value="all" ${flt === "all" ? "selected" : ""}>الكل</option><option value="no" ${flt === "no" ? "selected" : ""}>غير المنشورين</option><option value="pub" ${flt === "pub" ? "selected" : ""}>المنشورون</option></select>
        <button class="btn" id="bp">نشر المحدد (${sel.size})</button><button class="btn sec" id="bu">إلغاء نشر المحدد</button><button class="btn gold" id="ba">نشر كل غير المنشورين</button></div>
      <div class="tw"><table><thead><tr><th><input type="checkbox" id="ck" style="width:auto" aria-label="تحديد الكل"></th><th>الاسم</th><th>المسمى</th><th>التخصص</th><th>الحالة</th></tr></thead><tbody>${V.map((r) => `<tr><td><input type="checkbox" data-i="${r.id}" style="width:auto" ${sel.has(r.id) ? "checked" : ""}></td><td>${esc(r.full_name)}</td><td>${esc(r.job_titles?.name_ar || "—")}</td><td>${esc(r.specialty || "—")}</td><td><span class="badge ${r.publish_public ? "ok" : ""}">${r.publish_public ? "منشور" : "غير منشور"}</span></td></tr>`).join("") || '<tr><td colspan="5">لا توجد نتائج.</td></tr>'}</tbody></table></div>
      <p class="sub"><a href="people.html">معاينة صفحة المنسوبين</a> · <a href="index.html">معاينة الرئيسية</a></p></div>`;
    host.querySelector("#pg").onclick = async () => {
      const r = await sb.from("school_profile").update({ publish_public: !on }).eq("id", true); if (r.error) { toast(mapErr(r.error), true); return; }
      toast(on ? "أُوقف النشر العام" : "فُعّل النشر العام"); await load(); draw();
    };
    host.querySelector("#pq").oninput = (e) => { q = e.target.value.trim(); const pos = e.target.selectionStart; draw(); const i = host.querySelector("#pq"); i.focus(); i.setSelectionRange(pos, pos); };
    host.querySelector("#pf").onchange = (e) => { flt = e.target.value; draw(); };
    host.querySelector("#ck").onchange = (e) => { V.forEach((r) => (e.target.checked ? sel.add(r.id) : sel.delete(r.id))); draw(); };
    host.querySelectorAll("[data-i]").forEach((x) => (x.onchange = () => { x.checked ? sel.add(x.dataset.i) : sel.delete(x.dataset.i); host.querySelector("#bp").textContent = `نشر المحدد (${sel.size})`; }));
    host.querySelector("#bp").onclick = () => run(rows.filter((r) => sel.has(r.id) && !r.publish_public), true);
    host.querySelector("#bu").onclick = () => run(rows.filter((r) => sel.has(r.id) && r.publish_public), false);
    host.querySelector("#ba").onclick = () => run(rows.filter((r) => !r.publish_public), true);
  }
  async function run(list, publish) {
    if (!list.length) { toast("لا يوجد منسوبون مطابقون للإجراء", true); return; }
    if (!confirm(publish ? `نشر ${list.length} منسوباً في الموقع العام؟ تأكد من موافقتهم على ظهور الاسم والصورة والوظيفة والتخصص.` : `إلغاء نشر ${list.length} منسوباً من الموقع العام؟`)) return;
    let bad = 0;
    for (const r of list) {
      try {
        const patch = { publish_public: publish };
        if (!publish) { if (r.public_photo_path) { await sb.storage.from("public-photos").remove([r.public_photo_path]); patch.public_photo_path = null; } }
        else if (r.photo_path && !r.public_photo_path) {
          const d = await sb.storage.from("registry-media").download(r.photo_path);
          if (!d.error) { const type = d.data.type || "image/jpeg", path = `personnel/${r.id}/${Date.now()}.${type.split("/")[1]}`; const u = await sb.storage.from("public-photos").upload(path, d.data, { contentType: type }); if (!u.error) patch.public_photo_path = path; }
        }
        const res = await sb.from("staff_members").update(patch).eq("id", r.id); if (res.error) throw res.error;
      } catch (x) { console.error(x); bad++; }
    }
    sel.clear(); toast(bad ? `تم مع تعذّر ${bad} سجل` : publish ? "تم النشر" : "تم إلغاء النشر", !!bad); await load(); draw();
  }
  await load(); draw();
}
