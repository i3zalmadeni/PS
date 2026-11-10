boot("dashboard.html", async (m, c) => {
  const [staff, cats, teams, mem, sys] = await Promise.all([
    sb.from("staff_members").select("category,specialty,is_active,account_status").eq("is_active", true),
    sb.from("staff_categories").select("code,name_ar").order("sort_order"),
    sb.from("teams").select("id,name,status,team_memberships(member_role,ended_on)").eq("status", "active"),
    sb.from("team_memberships").select("id", { count: "exact", head: true }).is("ended_on", null),
    sb.from("systems").select("code,name_ar,status,last_seen_at").order("name_ar"),
  ]);
  const s = staff.data || [], t = teams.data || [];
  const by = (k) => s.filter((x) => x.category === k).length;
  const specs = new Set(s.filter((x) => x.category === "teaching" && x.specialty).map((x) => x.specialty)).size;
  const noLeader = t.filter((x) => !x.team_memberships.some((y) => !y.ended_on && y.member_role === "leader"));
  const alerts = [];
  if (c.isAdmin) {
    const noAcc = s.filter((x) => x.account_status === "none").length;
    if (noAcc) alerts.push(`${noAcc} منسوب بلا حساب دخول. <a href="staff.html">عرض المنسوبين</a>`);
    const { count } = await sb.from("staff_profile_items").select("id", { count: "exact", head: true }).in("verification_status", ["submitted", "under_review"]);
    if (count) alerts.push(`${count} سجل مهني بانتظار الاعتماد. <a href="staff.html">فتح الملفات</a>`);
  }
  if (noLeader.length) alerts.push(`${noLeader.length} فريق نشط بلا قائد. <a href="teams.html">إدارة الفرق</a>`);
  const down = (sys.data || []).filter((x) => x.status !== "connected");
  if (c.isAdmin && down.length) alerts.push(`${down.length} نظام غير متصل. <a href="integrations.html">مركز الربط</a>`);

  let recent = "";
  if (c.isAdmin) {
    const { data: a } = await sb.from("audit_logs").select("action,table_name,created_at").order("created_at", { ascending: false }).limit(8);
    recent = `<h3 class="sec">آخر العمليات</h3><div class="card">${(a || []).map((x) => `<div class="row2"><span>${esc(x.action)} · ${esc(x.table_name || "")}</span><small>${fmt(x.created_at)}</small></div>`).join("") || "لا توجد عمليات."} <p><a href="audit.html">سجل التدقيق الكامل</a></p></div>`;
  }
  m.innerHTML = head("لوحة النواة الرقمية", "المرجع المركزي للمنسوبين والفرق والهوية والصلاحيات") +
    (alerts.length ? alerts.map((a) => `<div class="alert">${a}</div>`).join("") : "") +
    `<div class="grid">
      <a class="card stat" href="staff.html"><b>${s.length}</b><span>إجمالي المنسوبين</span></a>
      ${(cats.data || []).map((x) => `<a class="card stat" href="staff.html?cat=${x.code}"><b>${by(x.code)}</b><span>${esc(x.name_ar)}</span></a>`).join("")}
      <div class="card stat"><b>${specs}</b><span>تخصصات الهيئة التعليمية</span></div>
      <a class="card stat" href="teams.html"><b>${t.length}</b><span>فرق ولجان نشطة</span></a>
      <div class="card stat"><b>${mem.count ?? 0}</b><span>عضويات نشطة</span></div></div>
     <h3 class="sec">الأنظمة المرتبطة</h3>
     <div class="tw"><table><thead><tr><th>النظام</th><th>حالة الاتصال</th><th>آخر اتصال</th></tr></thead><tbody>
      ${(sys.data || []).map((x) => `<tr><td>${esc(x.name_ar)}</td><td><span class="badge ${x.status === "connected" ? "ok" : x.status === "suspended" ? "bad" : ""}">${({ planned: "مخطط", connected: "متصل", suspended: "موقوف" })[x.status]}</span></td><td>${x.last_seen_at ? fmt(x.last_seen_at) : "—"}</td></tr>`).join("") || '<tr><td colspan="3">لا توجد أنظمة.</td></tr>'}
     </tbody></table></div>${recent}`;
});
