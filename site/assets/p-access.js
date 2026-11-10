boot("access.html", async (m, c) => {
  const [st, ro, pe, sy, tm] = await Promise.all([
    sb.from("staff_members").select("id,full_name,user_id,account_status,job_titles(name_ar),staff_roles(id,role_code,system_code,team_id,started_on,ended_on),staff_permissions(permission_code,team_id)").eq("is_active", true).order("full_name"),
    sb.from("roles").select("*"), sb.from("permissions").select("*").order("code"), sb.from("systems").select("code,name_ar"), sb.from("teams").select("id,name")]);
  const R = Object.fromEntries((ro.data || []).map((x) => [x.code, x])), P = Object.fromEntries((pe.data || []).map((x) => [x.code, x])), SY = Object.fromEntries((sy.data || []).map((x) => [x.code, x.name_ar])), TM = Object.fromEntries((tm.data || []).map((x) => [x.id, x.name]));
  const staff = st.data || [];
  m.innerHTML = head("الهوية والصلاحيات", "الوظيفة الفعلية والدور التنظيمي والصلاحيات التقنية ثلاث طبقات منفصلة") +
    `<div class="card"><b>الأدوار المتاحة:</b> ${(ro.data || []).map((r) => `<span class="badge">${esc(r.name_ar)} (${L.rkind[r.kind]})</span>`).join(" ")}</div>
     <div class="bar mt"><input id="q" placeholder="بحث بالاسم"></div>
     <div class="tw"><table><thead><tr><th>المنسوب والمسمى الوظيفي</th><th>الأدوار النشطة</th><th>الصلاحيات</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const label = (r) => `${R[r.role_code]?.name_ar || r.role_code}${r.system_code ? " · " + SY[r.system_code] : ""}${r.team_id ? " · " + (TM[r.team_id] || "فريق") : ""}`;
  function draw() {
    const q = document.getElementById("q").value.trim();
    document.getElementById("tb").innerHTML = staff.filter((s) => !q || s.full_name.includes(q)).map((s) => `<tr><td><a href="profile.html?id=${s.id}">${esc(s.full_name)}</a><br><small>${esc(s.job_titles?.name_ar)} · ${L.acct[s.account_status]}</small></td>
      <td>${s.staff_roles.filter((r) => !r.ended_on).map((r) => `<span class="badge ok">${esc(label(r))}</span>`).join(" ") || "—"}</td>
      <td>${s.staff_permissions.map((p) => `<span class="badge">${esc(P[p.permission_code]?.name_ar || p.permission_code)}${p.team_id ? " · " + esc(TM[p.team_id] || "") : ""}</span>`).join(" ") || "—"}</td>
      <td><button class="btn sm sec" data-s="${s.id}">إدارة</button></td></tr>`).join("");
  }
  document.getElementById("q").oninput = draw; draw();
  m.addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (b) manage(staff.find((x) => x.id === b.dataset.s)); });
  async function reload() { const r = await sb.from("staff_members").select("id,full_name,user_id,account_status,job_titles(name_ar),staff_roles(id,role_code,system_code,team_id,started_on,ended_on),staff_permissions(permission_code,team_id)").eq("is_active", true).order("full_name"); staff.splice(0, staff.length, ...(r.data || [])); draw(); }
  function manage(s) {
    const md = modal(`<h3>${esc(s.full_name)}</h3><p><small>الوظيفة: ${esc(s.job_titles?.name_ar)} (لا تحدد الصلاحيات وحدها)</small></p>
      <h3 class="sec">الأدوار</h3>${s.staff_roles.filter((r) => !r.ended_on).map((r) => `<div class="row2 item"><span>${esc(label(r))}</span><button class="btn sm bad" data-er="${r.id}">إنهاء</button></div>`).join("") || '<p class="sub">لا توجد أدوار نشطة.</p>'}
      <div class="fg mt"><div><label>الدور</label><select id="rc">${Object.values(R).map((r) => `<option value="${r.code}">${esc(r.name_ar)}</option>`).join("")}</select></div><div><label>خاص بنظام</label><select id="rs"><option value="">كل الأنظمة</option>${opts(SY)}</select></div>
      <div><label>خاص بفريق</label><select id="rt"><option value="">—</option>${opts(TM)}</select></div></div><button class="btn mt" id="ar">إضافة الدور</button>
      <h3 class="sec">صلاحيات الأنظمة</h3>${s.staff_permissions.map((p) => `<div class="row2 item"><span>${esc(P[p.permission_code]?.name_ar || p.permission_code)}${p.team_id ? " · " + esc(TM[p.team_id] || "") : ""}</span><button class="btn sm bad" data-rp="${esc(p.permission_code)}" data-tm="${p.team_id || ""}">سحب</button></div>`).join("") || '<p class="sub">لا توجد صلاحيات ممنوحة.</p>'}
      <div class="fg mt"><div><label>الصلاحية</label><select id="pc">${Object.values(P).map((p) => `<option value="${p.code}">${esc(p.name_ar)}</option>`).join("")}</select></div><div><label>ضمن فريق (اختياري)</label><select id="pt"><option value="">—</option>${opts(TM)}</select></div></div>
      <button class="btn mt" id="ap">منح الصلاحية</button><p class="err" id="fe"></p><div class="acts mt"><button class="btn sec" id="cx">إغلاق</button></div>`);
    const g = (i) => md.el.querySelector(i), done = async () => { md.close(); await reload(); };
    g("#cx").onclick = md.close;
    g("#ar").onclick = async () => { const r = await sb.from("staff_roles").insert({ staff_id: s.id, role_code: g("#rc").value, system_code: nn(g("#rs").value), team_id: nn(g("#rt").value) }); r.error ? (g("#fe").textContent = mapErr(r.error)) : done(); };
    g("#ap").onclick = async () => { const r = await sb.from("staff_permissions").insert({ staff_id: s.id, permission_code: g("#pc").value, team_id: nn(g("#pt").value) }); r.error ? (g("#fe").textContent = /duplicate/.test(r.error.message) ? "الصلاحية ممنوحة بالفعل." : mapErr(r.error)) : done(); };
    md.el.querySelectorAll("[data-er]").forEach((b) => (b.onclick = async () => { await sb.from("staff_roles").update({ ended_on: today() }).eq("id", b.dataset.er); done(); }));
    md.el.querySelectorAll("[data-rp]").forEach((b) => (b.onclick = async () => { let q = sb.from("staff_permissions").delete().eq("staff_id", s.id).eq("permission_code", b.dataset.rp); q = b.dataset.tm ? q.eq("team_id", b.dataset.tm) : q.is("team_id", null); await q; done(); }));
  }
}, { admin: true });
