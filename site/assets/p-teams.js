boot("teams.html", async (m, c) => {
  const [ty, sy] = await Promise.all([sb.from("team_types").select("*"), sb.from("systems").select("code,name_ar")]);
  const TY = Object.fromEntries((ty.data || []).map((x) => [x.code, x.name_ar])), SY = Object.fromEntries((sy.data || []).map((x) => [x.code, x.name_ar]));
  let rows = [];
  async function load() { rows = (await sb.from("teams").select("*,team_memberships(member_role,ended_on)").order("created_at", { ascending: false })).data || []; }
  await load();
  m.innerHTML = head("الفرق واللجان", "إدارة مركزية للفرق والعضويات؛ العمليات التشغيلية تبقى في نظام كل فريق") +
    `<div class="bar"><input id="q" placeholder="بحث بالاسم"><select id="ft"><option value="">كل الأنواع</option>${opts(TY)}</select><select id="fs"><option value="">كل الحالات</option>${opts(L.tstatus)}</select>${c.isAdmin ? '<button class="btn" id="add">فريق جديد</button>' : ""}</div>
     <div class="tw"><table><thead><tr><th>الفريق</th><th>النوع</th><th>النظام المرتبط</th><th>الأعضاء النشطون</th><th>الحالة</th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const draw = () => {
    const q = document.getElementById("q").value.trim(), t = document.getElementById("ft").value, s = document.getElementById("fs").value;
    document.getElementById("tb").innerHTML = rows.filter((r) => (!q || r.name.includes(q)) && (!t || r.type_code === t) && (!s || r.status === s)).map((r) =>
      `<tr><td><a href="team.html?id=${r.id}">${esc(r.name)}</a></td><td>${esc(TY[r.type_code])}</td><td>${esc(SY[r.system_code] || "—")}</td><td>${r.team_memberships.filter((x) => !x.ended_on).length}</td><td><span class="badge ${r.status === "active" ? "ok" : ""}">${L.tstatus[r.status]}</span></td></tr>`).join("") || '<tr><td colspan="5">لا توجد فرق.</td></tr>';
  };
  ["q", "ft", "fs"].forEach((i) => document.getElementById(i).addEventListener("input", draw)); draw();
  if (!c.isAdmin) return;
  document.getElementById("add").onclick = () => {
    const md = modal(`<h3>فريق جديد</h3><form id="tf"><div class="fg"><div><label>النوع *</label><select name="type_code">${opts(TY)}</select></div><div><label>النظام المرتبط</label><select name="system_code"><option value="">—</option>${opts(SY)}</select></div>
      <div class="full"><label>الاسم *</label><input name="name" required minlength="2"></div><div class="full"><label>الوصف</label><textarea name="description"></textarea></div><div class="full"><label>الأهداف</label><textarea name="goals"></textarea></div>
      <div><label>مشروع/مرجع مرتبط</label><input name="project_ref"></div><div></div><div><label>البداية</label><input type="date" name="starts_on" value="${today()}"></div><div><label>النهاية</label><input type="date" name="ends_on"></div></div>
      <p class="err" id="fe"></p><div class="acts mt"><button class="btn">إنشاء</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
    md.el.querySelector("#cx").onclick = md.close;
    md.el.querySelector("#tf").onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
      const r = await sb.from("teams").insert({ type_code: v.type_code, name: v.name.trim(), description: nn(v.description.trim()), goals: nn(v.goals.trim()), system_code: nn(v.system_code), project_ref: nn(v.project_ref.trim()), starts_on: nn(v.starts_on), ends_on: nn(v.ends_on), created_by: c.uid }).select("id").single();
      if (r.error) { md.el.querySelector("#fe").textContent = mapErr(r.error); return; } location.href = "team.html?id=" + r.data.id; };
  };
});
