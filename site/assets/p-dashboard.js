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
      ${reg("school.html", IC.school, 0, "سجل المدرسة", "الملف المركزي والقيادة والأعوام والمراحل والفصول.")}
      ${reg("staff.html", IC.users, 3, "سجل المنسوبين", "الهيئة التعليمية والإدارية والمساندة.")}
      ${c.can("students:view") ? reg("students.html", IC.cap, 1, "سجل المتعلمين", "الهوية والتسجيل لكل عام وأولياء الأمور.") : ""}
      ${reg("facilities.html", IC.building, 4, "سجل المرافق", "الهوية الثابتة والموقع والمسؤولون والتجهيزات.")}</div>`;
});
