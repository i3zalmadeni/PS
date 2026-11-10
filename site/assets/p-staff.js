boot("staff.html", async (m, c) => {
  const [cats, titles] = await Promise.all([sb.from("staff_categories").select("*").order("sort_order"), sb.from("job_titles").select("*").eq("is_active", true)]);
  const C = cats.data || [], T = titles.data || [];
  let rows = [], priv = {};
  async function load() {
    const r = await sb.from("staff_members").select("*,job_titles(name_ar),staff_categories(name_ar),staff_teaching(*)").order("full_name");
    rows = r.data || [];
    if (c.isAdmin) { const p = await sb.from("staff_private").select("*"); priv = Object.fromEntries((p.data || []).map((x) => [x.staff_id, x])); }
  }
  await load();
  m.innerHTML = head("المنسوبون", "قاعدة بيانات منسوبي المدرسة") +
    `<div class="bar"><input id="q" placeholder="بحث بالاسم أو التخصص"><select id="fc"><option value="">كل الفئات</option>${C.map((x) => `<option value="${x.code}">${esc(x.name_ar)}</option>`).join("")}</select>
     <select id="fs"><option value="">كل الحالات</option>${opts(L.acct)}</select>
     ${c.isAdmin ? '<button class="btn" id="add">إضافة منسوب</button><a class="btn sec" href="import.html">استيراد Excel</a>' : ""}</div>
     <div class="tw"><table><thead><tr><th>الاسم</th><th>الفئة</th><th>المسمى</th><th>التخصص</th><th>الحساب</th>${c.isAdmin ? "<th></th>" : ""}</tr></thead><tbody id="tb"></tbody></table></div>`;
  const fc = document.getElementById("fc"); if (qs("cat")) fc.value = qs("cat");
  function draw() {
    const q = document.getElementById("q").value.trim(), f = fc.value, st = document.getElementById("fs").value;
    document.getElementById("tb").innerHTML = rows.filter((r) => (!q || r.full_name.includes(q) || (r.specialty || "").includes(q)) && (!f || r.category === f) && (!st || r.account_status === st))
      .map((r) => `<tr><td><a href="profile.html?id=${r.id}">${esc(r.full_name)}</a>${r.is_active ? "" : ' <span class="badge">غير نشط</span>'}</td><td>${esc(r.staff_categories?.name_ar)}</td><td>${esc(r.job_titles?.name_ar)}</td><td>${esc(r.specialty || "—")}</td>
        <td><span class="badge ${r.account_status === "active" ? "ok" : r.account_status === "suspended" ? "bad" : ""}">${L.acct[r.account_status]}</span></td>
        ${c.isAdmin ? `<td class="acts"><button class="btn sm sec" data-e="${r.id}">تعديل</button><button class="btn sm sec" data-a="${r.id}">الحساب</button></td>` : ""}</tr>`).join("") || '<tr><td colspan="6">لا توجد نتائج.</td></tr>';
  }
  ["q", "fc", "fs"].forEach((i) => document.getElementById(i).addEventListener("input", draw)); draw();
  if (!c.isAdmin) return;
  document.getElementById("add").onclick = () => form(null);
  m.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.e) form(rows.find((x) => x.id === b.dataset.e)); if (b.dataset.a) account(rows.find((x) => x.id === b.dataset.a)); });

  function form(r) {
    const p = r ? priv[r.id] || {} : {}, tc = r?.staff_teaching || {};
    const md = modal(`<h3>${r ? "تعديل منسوب" : "إضافة منسوب"}</h3><form id="sf"><div class="fg">
      <div class="full"><label>الاسم الكامل *</label><input name="full_name" required minlength="2" value="${esc(r?.full_name)}"></div>
      <div><label>الفئة *</label><select name="category" required>${C.map((x) => `<option value="${x.code}" ${r?.category === x.code ? "selected" : ""}>${esc(x.name_ar)}</option>`).join("")}</select></div>
      <div><label>المسمى الوظيفي *</label><select name="job_title" required></select></div>
      <div><label>الرقم الوظيفي</label><input name="employee_no" value="${esc(p.employee_no)}"></div>
      <div><label>تاريخ الانضمام</label><input type="date" name="joined_on" value="${esc(r?.joined_on || today())}"></div>
      <div><label>البريد الإلكتروني</label><input type="email" name="email" value="${esc(p.email)}"></div>
      <div><label>الجوال</label><input name="phone" value="${esc(p.phone)}"></div>
      <div><label>المؤهل</label><input name="qualification" value="${esc(r?.qualification)}"></div>
      <div id="tspec"><label>التخصص</label><input name="specialty" value="${esc(r?.specialty)}"></div>
      <div class="full" id="tteach"><div class="fg"><div><label>المرحلة</label><input name="stage" value="${esc(tc.stage)}"></div>
        <div><label>المواد (افصل بفاصلة)</label><input name="subjects" value="${esc((tc.subjects || []).join("، "))}"></div>
        <div><label>الصفوف (افصل بفاصلة)</label><input name="grades" value="${esc((tc.grades || []).join("، "))}"></div></div></div>
      <div><label>الحالة</label><select name="is_active"><option value="true" ${r?.is_active !== false ? "selected" : ""}>نشط</option><option value="false" ${r?.is_active === false ? "selected" : ""}>غير نشط</option></select></div>
      </div><p class="err" id="fe"></p><div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
    const f = md.el.querySelector("#sf"), cat = f.category, jt = f.job_title;
    const sync = () => { jt.innerHTML = T.filter((t) => t.category === cat.value).map((t) => `<option value="${t.code}" ${r?.job_title === t.code ? "selected" : ""}>${esc(t.name_ar)}</option>`).join(""); const te = cat.value === "teaching"; md.el.querySelector("#tteach").hidden = !te; md.el.querySelector("#tspec").hidden = !te; };
    cat.onchange = sync; sync(); md.el.querySelector("#cx").onclick = md.close;
    f.onsubmit = async (e) => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(f)); const err = md.el.querySelector("#fe"); err.textContent = "";
      const te = v.category === "teaching";
      const base = { full_name: v.full_name.trim(), category: v.category, job_title: v.job_title, specialty: te ? nn(v.specialty?.trim()) : null, qualification: nn(v.qualification.trim()), joined_on: v.joined_on || today(), is_active: v.is_active === "true" };
      const id = r?.id || crypto.randomUUID();
      const res = r ? await sb.from("staff_members").update(base).eq("id", id) : await sb.from("staff_members").insert({ ...base, id, created_by: c.uid });
      if (res.error) { err.textContent = mapErr(res.error); return; }
      const pr = await sb.from("staff_private").upsert({ staff_id: id, employee_no: nn(v.employee_no.trim()), email: nn(v.email.trim().toLowerCase()), phone: nn(v.phone.trim()) }, { onConflict: "staff_id" });
      if (pr.error) { err.textContent = mapErr(pr.error); return; }
      if (te) { const sp = (s) => s.split(/[،,;]/).map((x) => x.trim()).filter(Boolean); await sb.from("staff_teaching").upsert({ staff_id: id, stage: nn(v.stage.trim()), subjects: sp(v.subjects), grades: sp(v.grades) }, { onConflict: "staff_id" }); }
      md.close(); toast("تم الحفظ"); await load(); draw();
    };
  }
  function account(r) {
    const em = (priv[r.id] || {}).email || "";
    const md = modal(`<h3>حساب الدخول: ${esc(r.full_name)}</h3><p>الحالة الحالية: <b>${L.acct[r.account_status]}</b></p>
      ${r.user_id ? `<div class="acts"><button class="btn ${r.account_status === "suspended" ? "" : "bad"}" id="tg">${r.account_status === "suspended" ? "تفعيل الحساب" : "إيقاف الحساب"}</button></div>
        <h3 class="sec">إعادة تعيين كلمة المرور</h3><div class="bar"><input id="np" type="password" placeholder="10 أحرف على الأقل" autocomplete="new-password"><button class="btn" id="rp">تعيين</button></div>`
      : `<div class="fg"><div><label>البريد الإلكتروني</label><input id="ae" type="email" value="${esc(em)}"></div><div><label>كلمة المرور المؤقتة (10 أحرف على الأقل)</label><input id="ap" type="password" autocomplete="new-password"></div></div><div class="acts mt"><button class="btn" id="mk">إنشاء الحساب</button></div>`}
      <p class="err" id="ae2"></p>`);
    const run = async (fn) => { try { await fn(); md.close(); toast("تم"); await load(); draw(); } catch (e) { md.el.querySelector("#ae2").textContent = e.message; } };
    const g = (i) => md.el.querySelector(i);
    if (g("#mk")) g("#mk").onclick = () => run(() => api("/admin/create-account", { staff_id: r.id, email: g("#ae").value, password: g("#ap").value }));
    if (g("#tg")) g("#tg").onclick = () => run(() => api("/admin/set-status", { staff_id: r.id, status: r.account_status === "suspended" ? "active" : "suspended" }));
    if (g("#rp")) g("#rp").onclick = () => run(() => api("/admin/reset-password", { staff_id: r.id, password: g("#np").value }));
  }
});
