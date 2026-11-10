const CAT_AR = { teaching: "الهيئة التعليمية", administrative: "الهيئة الإدارية", support: "الهيئة المساندة" };
boot("dashboard.html", async (m, c) => {
  const [st, sc, gr, ft] = await Promise.all([sb.rpc("school_stats"), sb.from("school_profile").select("*").maybeSingle(), sb.from("grade_levels").select("code,name_ar").order("sort_order"), sb.from("facility_types").select("code,name_ar")]);
  const s = st.data || {}, p = sc.data || {}, G = Object.fromEntries((gr.data || []).map((x) => [x.code, x.name_ar])), FT = Object.fromEntries((ft.data || []).map((x) => [x.code, x.name_ar]));
  const lst = (o, names) => Object.entries(o || {}).map(([k, v]) => `<div class="row2"><span>${esc(names[k] || k)}</span><b>${v}</b></div>`).join("") || '<span class="sub">لا توجد بيانات بعد.</span>';
  m.innerHTML = head(p.official_name || "النواة الرقمية", "ملخص البيانات الرئيسية للمدرسة، وكلها محسوبة تلقائياً من السجلات") +
    (s.current_year ? `<div class="alert" style="background:var(--c4b);color:var(--c4f)">العام الدراسي الحالي: <b>${esc(s.current_year)}</b></div>` : `<div class="alert">لا يوجد عام دراسي حالي. ${c.isAdmin ? '<a href="school.html#years">أنشئ العام الدراسي الأول</a> لتُحسب أعداد المتعلمين والفصول.' : "يُنشئه مدير النواة."}</div>`) +
    `<div class="grid">
      <div class="card stat"><b>${s.personnel_total ?? 0}</b><span>إجمالي المنسوبين</span></div>
      <div class="card stat"><b>${s.students_total ?? 0}</b><span>المتعلمون المنتظمون</span></div>
      <div class="card stat"><b>${s.classes_total ?? 0}</b><span>الفصول الدراسية</span></div>
      <div class="card stat"><b>${s.facilities_total ?? 0}</b><span>المرافق</span></div>
      <div class="card stat"><b>${s.capacity ?? 0}</b><span>الطاقة الاستيعابية</span></div></div>
    <h3 class="sec">إحصاءات أساسية</h3><div class="grid">
      <div class="card"><b>المنسوبون حسب الفئة</b>${lst(s.personnel_by_category, CAT_AR)}</div>
      <div class="card"><b>المتعلمون حسب المرحلة</b>${lst(s.students_by_grade, G)}</div>
      <div class="card"><b>الفصول حسب المرحلة</b>${lst(s.classes_by_grade, G)}</div>
      <div class="card"><b>المرافق حسب النوع</b>${lst(s.facilities_by_type, FT)}</div></div>
    <h3 class="sec">بيانات المدرسة</h3><div class="card"><div class="fg">
      ${[["الرقم الوزاري", p.ministry_no], ["المرحلة", p.stage], ["نوع المدرسة", [p.school_type, L.gender[p.gender]].filter(Boolean).join(" · ")], ["الإدارة التعليمية", p.education_department], ["مكتب التعليم", p.education_office], ["الموقع", [p.city, p.district].filter(Boolean).join("، ")]].map(([k, v]) => `<div><small class="sub">${k}</small><br><b>${esc(v || "—")}</b></div>`).join("")}</div></div>
    <h3 class="sec">السجلات الأربعة</h3><div class="grid">
      <a class="card feat" href="school.html" style="text-decoration:none"><b>سجل المدرسة</b>الملف المركزي والقيادة والأعوام والمراحل والفصول.</a>
      <a class="card feat" href="staff.html" style="text-decoration:none"><b>سجل المنسوبين</b>الهيئة التعليمية والإدارية والمساندة.</a>
      ${c.can("students:view") ? '<a class="card feat" href="students.html" style="text-decoration:none"><b>سجل المتعلمين</b>الهوية والتسجيل لكل عام وأولياء الأمور.</a>' : ""}
      <a class="card feat" href="facilities.html" style="text-decoration:none"><b>سجل المرافق</b>الهوية الثابتة والموقع والمسؤولون والتجهيزات.</a></div>`;
});
