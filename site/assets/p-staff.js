const CAT_AR2 = { teaching: "الهيئة التعليمية", administrative: "الهيئة الإدارية", support: "الهيئة المساندة" };
boot("staff.html", async (m, c) => {
  // المنسوبون: عرض فقط للمنسوبين المعتمدين العاملين حالياً (على رأس العمل أو في إجازة). كل التعديل من «المستخدمون والصلاحيات».
  if (!(c.can("personnel:view") || c.can("users:manage"))) { location.replace("dashboard.html"); return; }
  const cats = await sb.from("staff_categories").select("*").order("sort_order"), C = cats.data || [];
  const canContact = c.can("personnel_contact:view") || c.can("personnel:edit") || c.can("users:manage");
  let rows = [], priv = {};
  const r0 = await sb.from("staff_members").select("*,job_titles(name_ar),staff_categories(name_ar)").eq("is_active", true).order("full_name"); rows = r0.data || [];
  if (canContact) { const p = await sb.from("staff_private").select("staff_id,employee_no,email,phone"); priv = Object.fromEntries((p.data || []).map((x) => [x.staff_id, x])); }
  const LIVE_L = { active: L.emp.active, on_leave: L.emp.on_leave };
  m.innerHTML = head("المنسوبون", "المنسوبون المعتمدون العاملون في المدرسة حالياً، للاطلاع فقط") +
    `<div class="bar"><input id="q" placeholder="بحث بالاسم أو التخصص أو القسم"><select id="fc"><option value="">كل الفئات</option>${C.map((x) => `<option value="${x.code}">${esc(x.name_ar)}</option>`).join("")}</select>
     <select id="fe"><option value="">كل الحالات</option>${opts(LIVE_L)}</select><button class="btn sec" id="ex">تصدير Excel</button><button class="btn sec" id="hs">سجل التغييرات</button>${c.can("users:manage") ? '<a class="btn" href="access.html">إدارة المستخدمين</a>' : ""}</div>
     <div class="tw"><table><thead><tr><th>الاسم</th><th>الفئة</th><th>المسمى</th><th>التخصص</th><th>القسم</th><th>الحالة</th><th></th></tr></thead><tbody id="tb"></tbody></table></div><p class="sub" id="cnt"></p>`;
  const fc = m.querySelector("#fc"); if (qs("cat")) fc.value = qs("cat");
  function filtered() {
    const q = m.querySelector("#q").value.trim(), f = m.querySelector("#fc").value, s = m.querySelector("#fe").value;
    return rows.filter((r) => (!q || r.full_name.includes(q) || (r.specialty || "").includes(q) || (r.department || "").includes(q)) && (!f || r.category === f) && (!s || r.employment_status === s));
  }
  function draw() {
    const list = filtered();
    m.querySelector("#tb").innerHTML = list.map((r) => `<tr><td>${esc(r.full_name)}</td><td>${esc(r.staff_categories?.name_ar)}</td><td>${esc(r.job_titles?.name_ar)}</td><td>${esc(r.specialty || "—")}</td><td>${esc(r.department || "—")}</td>
      <td><span class="badge ${r.employment_status === "active" ? "ok" : ""}">${L.emp[r.employment_status] || "—"}</span>${r.publish_public ? ' <span class="badge" title="يظهر في الموقع العام">منشور</span>' : ""}</td>
      <td class="acts"><button class="btn sm sec" data-d="${r.id}">التفاصيل</button></td></tr>`).join("") || '<tr><td colspan="7">لا توجد نتائج.</td></tr>';
    m.querySelector("#cnt").textContent = `${list.length} من ${rows.length} منسوب`;
  }
  async function details(r) {
    const p = priv[r.id] || {}, img = await signed(r.photo_path);
    const md = modal(`<h3>${esc(r.full_name)}</h3><div class="row2" style="align-items:flex-start;gap:16px">${img ? `<img src="${img}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:12px">` : ""}<div class="fg" style="flex:1">
      ${[["الفئة", r.staff_categories?.name_ar], ["المسمى", r.job_titles?.name_ar], ["التخصص", r.specialty], ["المؤهل", r.qualification], ["القسم", r.department], ["الحالة الوظيفية", L.emp[r.employment_status]], ["تاريخ الانضمام", fmt(r.joined_on)], ...(canContact ? [["الرقم الوظيفي", p.employee_no], ["البريد", p.email], ["الجوال", p.phone]] : [])]
        .map(([k, v]) => `<div><small class="sub">${k}</small><br><b>${esc(v || "—")}</b></div>`).join("")}</div></div><div class="acts mt"><button class="btn sec" id="h">سجل التغييرات</button><button class="btn sec" id="cx">إغلاق</button></div>`, true);
    md.el.querySelector("#cx").onclick = md.close; md.el.querySelector("#h").onclick = () => showHistory("staff_members", r.id, r.full_name);
  }
  ["q", "fc", "fe"].forEach((i) => m.querySelector("#" + i).addEventListener("input", draw)); draw();
  m.querySelector("#hs").onclick = () => showHistory("staff_members", null, "المنسوبون");
  m.querySelector("#ex").onclick = () => exportXlsx("سجل-المنسوبين", ["الاسم", "الفئة", "المسمى", "التخصص", "المؤهل", "القسم", "الحالة الوظيفية", "تاريخ الانضمام", ...(canContact ? ["الرقم الوظيفي", "البريد", "الجوال"] : [])],
    filtered().map((r) => [r.full_name, r.staff_categories?.name_ar, r.job_titles?.name_ar, r.specialty, r.qualification, r.department, L.emp[r.employment_status], r.joined_on, ...(canContact ? [priv[r.id]?.employee_no, priv[r.id]?.email, priv[r.id]?.phone] : [])]));
  m.addEventListener("click", (e) => { const b = e.target.closest("button[data-d]"); if (b) details(rows.find((x) => x.id === b.dataset.d)); });
});
