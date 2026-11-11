const CAT_AR2 = { teaching: "الهيئة التعليمية", administrative: "الهيئة الإدارية", support: "الهيئة المساندة" };
boot("staff.html", async (m, c) => {
  const [cats, titles] = await Promise.all([sb.from("staff_categories").select("*").order("sort_order"), sb.from("job_titles").select("*").eq("is_active", true)]);
  const C = cats.data || [], T = titles.data || [];
  const canAdd = c.can("personnel:add"), canEdit = c.can("personnel:edit"), canContact = c.can("personnel_contact:view") || canEdit;
  let rows = [], priv = {}, tab = "list";
  async function load() {
    const r = await sb.from("staff_members").select("*,job_titles(name_ar),staff_categories(name_ar)").order("full_name"); rows = r.data || [];
    if (canContact) { const p = await sb.from("staff_private").select("*"); priv = Object.fromEntries((p.data || []).map((x) => [x.staff_id, x])); }
  }
  await load();
  const titleOf = (name) => T.find((t) => t.name_ar === name);
  function paint() {
    m.innerHTML = head("سجل المنسوبين", "الهيئة التعليمية والإدارية والمساندة، بمعرّف ثابت لكل منسوب") +
      `<div class="bar"><input id="q" placeholder="بحث بالاسم أو التخصص أو القسم"><select id="fc"><option value="">كل الفئات</option>${C.map((x) => `<option value="${x.code}">${esc(x.name_ar)}</option>`).join("")}</select>
       <select id="fe"><option value="">كل الحالات الوظيفية</option>${opts(L.emp)}</select>
       ${canAdd ? '<button class="btn" id="add">إضافة منسوب</button><button class="btn sec" id="imp">استيراد Excel</button>' : ""}<button class="btn sec" id="ex">تصدير Excel</button><button class="btn sec" id="hs">سجل التغييرات</button></div>
       <div id="impbox"></div><div class="tw"><table><thead><tr><th>الاسم</th><th>الفئة</th><th>المسمى</th><th>التخصص</th><th>القسم</th><th>الحالة</th><th></th></tr></thead><tbody id="tb"></tbody></table></div><p class="sub" id="cnt"></p>`;
    const fc = m.querySelector("#fc"); if (qs("cat")) fc.value = qs("cat");
    ["q", "fc", "fe"].forEach((i) => m.querySelector("#" + i).addEventListener("input", draw)); draw();
    if (canAdd) { m.querySelector("#add").onclick = () => form(null); m.querySelector("#imp").onclick = openImport; }
    m.querySelector("#hs").onclick = () => showHistory("staff_members", null, "سجل المنسوبين");
    m.querySelector("#ex").onclick = () => exportXlsx("سجل-المنسوبين", ["الاسم", "الفئة", "المسمى", "التخصص", "المؤهل", "القسم", "الحالة الوظيفية", "تاريخ الانضمام", ...(canContact ? ["الرقم الوظيفي", "البريد", "الجوال"] : [])],
      filtered().map((r) => [r.full_name, r.staff_categories?.name_ar, r.job_titles?.name_ar, r.specialty, r.qualification, r.department, L.emp[r.employment_status], r.joined_on, ...(canContact ? [priv[r.id]?.employee_no, priv[r.id]?.email, priv[r.id]?.phone] : [])]));
    m.addEventListener("click", (e) => { const b = e.target.closest("button[data-d],button[data-e],button[data-a]"); if (!b) return; if (b.dataset.d) details(rows.find((x) => x.id === b.dataset.d)); if (b.dataset.e) form(rows.find((x) => x.id === b.dataset.e)); if (b.dataset.a) account(rows.find((x) => x.id === b.dataset.a)); }, { once: false });
  }
  function filtered() {
    const q = m.querySelector("#q").value.trim(), f = m.querySelector("#fc").value, s = m.querySelector("#fe").value;
    return rows.filter((r) => (!q || r.full_name.includes(q) || (r.specialty || "").includes(q) || (r.department || "").includes(q)) && (!f || r.category === f) && (!s || r.employment_status === s));
  }
  function draw() {
    const list = filtered();
    m.querySelector("#tb").innerHTML = list.map((r) => `<tr><td>${esc(r.full_name)}</td><td>${esc(r.staff_categories?.name_ar)}</td><td>${esc(r.job_titles?.name_ar)}</td><td>${esc(r.specialty || "—")}</td><td>${esc(r.department || "—")}</td>
      <td><span class="badge ${r.employment_status === "active" ? "ok" : ""}">${L.emp[r.employment_status] || "—"}</span>${r.publish_public ? ' <span class="badge" title="يظهر في الموقع العام">منشور</span>' : ""}</td>
      <td class="acts"><button class="btn sm sec" data-d="${r.id}">التفاصيل</button>${canEdit ? `<button class="btn sm sec" data-e="${r.id}">تعديل</button>` : ""}${c.isAdmin ? `<button class="btn sm sec" data-a="${r.id}">الحساب</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="7">لا توجد نتائج.</td></tr>';
    m.querySelector("#cnt").textContent = `${list.length} من ${rows.length} منسوب`;
  }

  async function details(r) {
    const p = priv[r.id] || {}, img = await signed(r.photo_path);
    const md = modal(`<h3>${esc(r.full_name)}</h3><div class="row2" style="align-items:flex-start;gap:16px">${img ? `<img src="${img}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:12px">` : ""}<div class="fg" style="flex:1">
      ${[["الفئة", r.staff_categories?.name_ar], ["المسمى", r.job_titles?.name_ar], ["التخصص", r.specialty], ["المؤهل", r.qualification], ["القسم", r.department], ["الحالة الوظيفية", L.emp[r.employment_status]], ["تاريخ الانضمام", fmt(r.joined_on)], ...(canContact ? [["الرقم الوظيفي", p.employee_no], ["معرّف الدخول", p.login_id], ["البريد", p.email], ["الجوال", p.phone]] : [])]
        .map(([k, v]) => `<div><small class="sub">${k}</small><br><b>${esc(v || "—")}</b></div>`).join("")}</div></div><div class="acts mt"><button class="btn sec" id="h">سجل التغييرات</button><button class="btn sec" id="cx">إغلاق</button></div>`, true);
    md.el.querySelector("#cx").onclick = md.close; md.el.querySelector("#h").onclick = () => showHistory("staff_members", r.id, r.full_name);
  }

  function form(r) {
    if (r ? !canEdit : !canAdd) return;
    const p = r ? priv[r.id] || {} : {};
    const md = modal(`<h3>${r ? "تعديل منسوب" : "إضافة منسوب"}</h3><form id="sf"><div class="fg">
      <div class="full"><label>الاسم الكامل *</label><input name="full_name" required minlength="2" value="${esc(r?.full_name)}"></div>
      <div><label>الفئة *</label><select name="category" required>${C.map((x) => `<option value="${x.code}" ${r?.category === x.code ? "selected" : ""}>${esc(x.name_ar)}</option>`).join("")}</select></div>
      <div><label>المسمى الوظيفي *</label><select name="job_title" required></select></div>
      <div><label>التخصص</label><input name="specialty" value="${esc(r?.specialty)}"></div>
      <div><label>المؤهل</label><input name="qualification" value="${esc(r?.qualification)}"></div>
      <div><label>القسم</label><input name="department" value="${esc(r?.department)}"></div>
      <div><label>الحالة الوظيفية</label><select name="employment_status">${opts(L.emp, r?.employment_status || "active")}</select></div>
      <div><label>تاريخ الانضمام</label><input type="date" name="joined_on" value="${esc(r?.joined_on || today())}"></div>
      <div><label>الصورة (اختياري)</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></div>
      <div class="full"><label class="chk"><input type="checkbox" name="publish_public" ${r?.publish_public ? "checked" : ""} style="width:auto"> إظهار الاسم والصورة والوظيفة والتخصص في الموقع العام (بموافقة المنسوب، دون أي بيانات تواصل)</label></div>
      ${canContact ? `<div><label>الرقم الوظيفي</label><input name="employee_no" value="${esc(p.employee_no)}"></div><div><label>البريد الإلكتروني</label><input type="email" name="email" value="${esc(p.email)}"></div><div><label>الجوال</label><input name="phone" value="${esc(p.phone)}"></div>` : ""}
      </div><p class="err" id="fe2"></p><div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
    const f = md.el.querySelector("#sf"), cat = f.category, jt = f.job_title;
    const sync = () => (jt.innerHTML = T.filter((t) => t.category === cat.value).map((t) => `<option value="${t.code}" ${r?.job_title === t.code ? "selected" : ""}>${esc(t.name_ar)}</option>`).join(""));
    cat.onchange = sync; sync(); md.el.querySelector("#cx").onclick = md.close;
    f.onsubmit = async (e) => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(f)), err = md.el.querySelector("#fe2"); err.textContent = "";
      const id = r?.id || crypto.randomUUID();
      const base = { full_name: v.full_name.trim(), category: v.category, job_title: v.job_title, specialty: nn(v.specialty), qualification: nn(v.qualification), department: nn(v.department), employment_status: v.employment_status, joined_on: v.joined_on || today(), publish_public: f.publish_public.checked };
      try {
        const file = f.photo.files[0]; if (file) base.photo_path = await uploadMedia("personnel", id, file);
        // نسخة عامة من الصورة: لا تُنشأ إلا لمن فعّلت الإدارة نشره، وتُزال عند إلغاء النشر
        const pub = async (blob, type) => { const path = `personnel/${id}/${Date.now()}.${type.split("/")[1]}`; const u = await sb.storage.from("public-photos").upload(path, blob, { contentType: type }); if (u.error) throw new Error("تعذّر نشر الصورة: " + u.error.message); return path; };
        const dropPub = async () => { if (r?.public_photo_path) await sb.storage.from("public-photos").remove([r.public_photo_path]); };
        if (!base.publish_public) { if (r?.public_photo_path) { await dropPub(); base.public_photo_path = null; } }
        else if (file) { await dropPub(); base.public_photo_path = await pub(file, file.type); }
        else if (r?.photo_path && !r.public_photo_path) { const d = await sb.storage.from("registry-media").download(r.photo_path); if (!d.error) base.public_photo_path = await pub(d.data, d.data.type || "image/jpeg"); }
        const res = r ? await sb.from("staff_members").update(base).eq("id", id) : await sb.from("staff_members").insert({ ...base, id, created_by: c.uid });
        if (res.error) throw res.error;
        if (canContact) { const pr = await sb.from("staff_private").upsert({ staff_id: id, employee_no: nn(v.employee_no), email: nn(v.email)?.toLowerCase() ?? null, phone: nn(v.phone) }, { onConflict: "staff_id" }); if (pr.error) throw pr.error; }
      } catch (x) { err.textContent = mapErr(x); return; }
      md.close(); toast("تم الحفظ"); await load(); draw();
    };
  }

  function account(r) {
    const md = modal(`<h3>حساب الدخول: ${esc(r.full_name)}</h3><p>الحالة الحالية: <b>${L.acct[r.account_status]}</b></p>${r.user_id ? `<p>معرّف الدخول: <b dir="ltr">${esc((priv[r.id] || {}).login_id || (priv[r.id] || {}).email || "—")}</b></p>` : ""}
      ${r.user_id ? `<div class="acts"><button class="btn ${r.account_status === "suspended" ? "" : "bad"}" id="tg">${r.account_status === "suspended" ? "تفعيل الحساب" : "إيقاف الحساب"}</button></div>
        <h3 class="sec">إعادة تعيين كلمة المرور</h3><div class="bar"><input id="np" type="password" placeholder="10 أحرف على الأقل" autocomplete="new-password"><button class="btn" id="rp">تعيين</button></div>`
      : `<div class="fg"><div><label>معرّف الدخول (أرقام أو حروف إنجليزية، 3 إلى 40 خانة)</label><input id="ae" dir="ltr" autocapitalize="none" spellcheck="false" placeholder="مثال: 1012345 أو t.salem" value="${esc((priv[r.id] || {}).login_id)}"></div><div><label>كلمة المرور المؤقتة (10 أحرف على الأقل)</label><input id="ap" type="password" autocomplete="new-password"></div></div><div class="acts mt"><button class="btn" id="mk">إنشاء الحساب</button></div>`}
      <p class="err" id="ae2"></p>`);
    const run = async (fn) => { try { await fn(); md.close(); toast("تم"); await load(); draw(); } catch (e) { md.el.querySelector("#ae2").textContent = e.message; } };
    const g = (i) => md.el.querySelector(i);
    if (g("#mk")) g("#mk").onclick = () => run(() => api("/admin/create-account", { staff_id: r.id, login_id: g("#ae").value, password: g("#ap").value }));
    if (g("#tg")) g("#tg").onclick = () => run(() => api("/admin/set-status", { staff_id: r.id, status: r.account_status === "suspended" ? "active" : "suspended" }));
    if (g("#rp")) g("#rp").onclick = () => run(() => api("/admin/reset-password", { staff_id: r.id, password: g("#np").value }));
  }

  function openImport() {
    const host = m.querySelector("#impbox"); const catBy = (s) => C.find((x) => x.name_ar === s || x.code === s);
    importUI(host, {
      registry: "personnel", label: "المنسوبين",
      fields: [["full_name", "الاسم الكامل *", ["الاسم", "الاسم الكامل"]], ["employee_no", "الرقم الوظيفي", ["الرقم الوظيفي", "رقم الموظف"]], ["category", "الفئة *", ["الفئة"]], ["job_title", "المسمى الوظيفي *", ["المسمى", "المسمى الوظيفي"]],
        ["specialty", "التخصص", ["التخصص"]], ["qualification", "المؤهل", ["المؤهل"]], ["department", "القسم", ["القسم"]], ["email", "البريد الإلكتروني", ["البريد", "البريد الإلكتروني"]], ["phone", "الجوال", ["الجوال", "رقم الجوال"]]],
      sample: ["اسم المنسوب", "1001", "الهيئة التعليمية", "معلم", "الرياضيات", "بكالوريوس", "", "name@example.com", "05xxxxxxxx"],
      prepare: async () => { const p = await sb.from("staff_private").select("staff_id,employee_no,email"); return { priv: p.data || [] }; },
      plan: (get, cx, seen) => {
        const errs = [], name = String(get("full_name")).trim(), eno = nn(String(get("employee_no"))), em = nn(String(get("email")))?.toLowerCase() || null, ct = catBy(String(get("category")).trim()), jt = ct && T.find((t) => t.category === ct.code && (t.name_ar === String(get("job_title")).trim() || t.code === String(get("job_title")).trim()));
        if (name.length < 2) errs.push("الاسم مطلوب"); if (!ct) errs.push("فئة غير معروفة"); else if (!jt) errs.push("مسمى غير معروف لهذه الفئة"); if (em && !/^\S+@\S+\.\S+$/.test(em)) errs.push("بريد غير صالح");
        const key = eno || em; if (key) { if (seen.has(key)) errs.push("مكرر داخل الملف"); seen.add(key); }
        const hit = cx.priv.find((x) => (eno && x.employee_no === eno) || (em && x.email === em));
        return { errs, mid: hit?.staff_id, name, rec: { base: { full_name: name, category: ct?.code, job_title: jt?.code, specialty: nn(String(get("specialty"))), qualification: nn(String(get("qualification"))), department: nn(String(get("department"))) }, pv: { employee_no: eno, email: em, phone: nn(String(get("phone"))) } } };
      },
      create: async (rec, cx, uid) => { const id = crypto.randomUUID(); let r = await sb.from("staff_members").insert({ ...rec.base, id, created_by: uid, joined_on: today() }); if (r.error) throw r.error; r = await sb.from("staff_private").upsert({ staff_id: id, ...rec.pv }, { onConflict: "staff_id" }); if (r.error) throw r.error; return id; },
      update: async (id, rec) => { let r = await sb.from("staff_members").update(rec.base).eq("id", id); if (r.error) throw r.error; r = await sb.from("staff_private").upsert({ staff_id: id, ...rec.pv }, { onConflict: "staff_id" }); if (r.error) throw r.error; },
    }, c, async () => { await load(); draw(); });
  }
  paint();
}, { perm: "personnel:view" });
