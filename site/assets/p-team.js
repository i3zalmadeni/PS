boot("team.html", async (m, c) => {
  const id = qs("id"); let t, mem = [], all = [];
  const [ty, sy] = await Promise.all([sb.from("team_types").select("*"), sb.from("systems").select("code,name_ar")]);
  const TY = Object.fromEntries((ty.data || []).map((x) => [x.code, x.name_ar])), SY = Object.fromEntries((sy.data || []).map((x) => [x.code, x.name_ar]));
  async function load() {
    t = (await sb.from("teams").select("*").eq("id", id).maybeSingle()).data;
    mem = (await sb.from("team_memberships").select("*,staff_members(id,full_name,category,job_titles(name_ar))").eq("team_id", id).order("started_on")).data || [];
    if (c.isAdmin) all = (await sb.from("staff_members").select("id,full_name,job_titles(name_ar)").eq("is_active", true).order("full_name")).data || [];
  }
  await load(); if (!t) { m.innerHTML = '<p class="err">الفريق غير موجود.</p>'; return; }
  function paint() {
    const act = mem.filter((x) => !x.ended_on), past = mem.filter((x) => x.ended_on);
    const row = (x, a) => `<tr><td><a href="profile.html?id=${x.staff_members.id}">${esc(x.staff_members.full_name)}</a><br><small>${esc(x.staff_members.job_titles?.name_ar)}</small></td><td>${L.member[x.member_role]}</td><td>${esc(x.responsibilities || "—")}</td><td>${fmt(x.started_on)}</td><td>${a ? "" : fmt(x.ended_on) + (x.end_reason ? "<br><small>" + esc(x.end_reason) + "</small>" : "")}</td>${a && c.isAdmin ? `<td class="acts"><button class="btn sm sec" data-me="${x.id}">تعديل</button><button class="btn sm bad" data-en="${x.id}">إنهاء</button></td>` : a ? "<td></td>" : ""}</tr>`;
    m.innerHTML = `<div class="row2"><div>${head(t.name, `${TY[t.type_code]} · ${L.tstatus[t.status]}${t.system_code ? " · مرتبط بنظام: " + SY[t.system_code] : ""}${t.project_ref ? " · " + t.project_ref : ""}`)}</div><div class="acts"><a class="btn sec" href="teams.html">الفرق</a>${c.isAdmin ? '<button class="btn sec" id="et">تعديل الفريق</button>' : ""}</div></div>
      <div class="card">${t.description ? `<p>${esc(t.description)}</p>` : ""}${t.goals ? `<p><b>الأهداف:</b> ${esc(t.goals)}</p>` : ""}<small>${fmt(t.starts_on)} – ${t.ends_on ? fmt(t.ends_on) : "مفتوح"}</small></div>
      <h3 class="sec">الأعضاء النشطون (${act.length})</h3>${c.isAdmin ? '<button class="btn" id="am">إضافة عضو</button>' : ""}
      <div class="tw mt"><table><thead><tr><th>العضو</th><th>الدور</th><th>المسؤوليات</th><th>من</th><th></th>${c.isAdmin ? "<th></th>" : ""}</tr></thead><tbody>${act.map((x) => row(x, true)).join("") || '<tr><td colspan="6">لا يوجد أعضاء.</td></tr>'}</tbody></table></div>
      ${past.length ? `<h3 class="sec">السجل التاريخي للعضويات المنتهية</h3><div class="tw"><table><thead><tr><th>العضو</th><th>الدور</th><th>المسؤوليات</th><th>من</th><th>إلى</th></tr></thead><tbody>${past.map((x) => row(x, false)).join("")}</tbody></table></div>` : ""}`;
    if (!c.isAdmin) return;
    m.querySelector("#et").onclick = editTeam; m.querySelector("#am").onclick = () => memForm(null);
    m.querySelectorAll("[data-me]").forEach((b) => (b.onclick = () => memForm(mem.find((x) => x.id === b.dataset.me))));
    m.querySelectorAll("[data-en]").forEach((b) => (b.onclick = () => {
      const md = modal(`<h3>إنهاء العضوية</h3><label>تاريخ الإنهاء</label><input type="date" id="d" value="${today()}"><label>السبب</label><input id="r"><p class="sub">يبقى سجل العضوية محفوظاً في التاريخ.</p><div class="acts mt"><button class="btn bad" id="ok">إنهاء</button><button class="btn sec" id="cx">إلغاء</button></div>`);
      md.el.querySelector("#cx").onclick = md.close;
      md.el.querySelector("#ok").onclick = async () => { const r = await sb.from("team_memberships").update({ ended_on: md.el.querySelector("#d").value, end_reason: nn(md.el.querySelector("#r").value.trim()) }).eq("id", b.dataset.en); if (r.error) { toast(mapErr(r.error), true); return; } md.close(); await load(); paint(); };
    }));
  }
  function memForm(x) {
    const have = new Set(mem.filter((y) => !y.ended_on).map((y) => y.staff_id));
    const md = modal(`<h3>${x ? "تعديل عضوية" : "إضافة عضو"}</h3><form id="mf"><div class="fg">
      <div class="full"><label>المنسوب *</label>${x ? `<input value="${esc(x.staff_members.full_name)}" disabled>` : `<select name="staff_id" required>${all.filter((a) => !have.has(a.id)).map((a) => `<option value="${a.id}">${esc(a.full_name)} — ${esc(a.job_titles?.name_ar)}</option>`).join("")}</select>`}</div>
      <div><label>الدور</label><select name="member_role">${opts(L.member, x?.member_role)}</select></div><div><label>تاريخ البداية</label><input type="date" name="started_on" value="${esc(x?.started_on || today())}"></div>
      <div class="full"><label>المسؤوليات</label><textarea name="responsibilities">${esc(x?.responsibilities)}</textarea></div></div><p class="err" id="fe"></p>
      <div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
    md.el.querySelector("#cx").onclick = md.close;
    md.el.querySelector("#mf").onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
      const p = { member_role: v.member_role, started_on: v.started_on, responsibilities: nn(v.responsibilities.trim()) };
      const r = x ? await sb.from("team_memberships").update(p).eq("id", x.id) : await sb.from("team_memberships").insert({ ...p, team_id: id, staff_id: v.staff_id });
      if (r.error) { md.el.querySelector("#fe").textContent = mapErr(r.error); return; } md.close(); await load(); paint(); };
  }
  function editTeam() {
    const md = modal(`<h3>تعديل الفريق</h3><form id="tf"><div class="fg"><div class="full"><label>الاسم</label><input name="name" required value="${esc(t.name)}"></div>
      <div><label>النوع</label><select name="type_code">${opts(TY, t.type_code)}</select></div><div><label>الحالة</label><select name="status">${opts(L.tstatus, t.status)}</select></div>
      <div><label>النظام المرتبط</label><select name="system_code"><option value="">—</option>${opts(SY, t.system_code)}</select></div><div><label>مشروع/مرجع</label><input name="project_ref" value="${esc(t.project_ref)}"></div>
      <div class="full"><label>الوصف</label><textarea name="description">${esc(t.description)}</textarea></div><div class="full"><label>الأهداف</label><textarea name="goals">${esc(t.goals)}</textarea></div>
      <div><label>البداية</label><input type="date" name="starts_on" value="${esc(t.starts_on)}"></div><div><label>النهاية</label><input type="date" name="ends_on" value="${esc(t.ends_on)}"></div></div>
      <div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
    md.el.querySelector("#cx").onclick = md.close;
    md.el.querySelector("#tf").onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
      const r = await sb.from("teams").update({ name: v.name.trim(), type_code: v.type_code, status: v.status, system_code: nn(v.system_code), project_ref: nn(v.project_ref.trim()), description: nn(v.description.trim()), goals: nn(v.goals.trim()), starts_on: nn(v.starts_on), ends_on: nn(v.ends_on) }).eq("id", id);
      if (r.error) { toast(mapErr(r.error), true); return; } md.close(); await load(); paint(); };
  }
  paint();
});
