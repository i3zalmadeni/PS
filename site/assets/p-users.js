const CAT_AR2 = { teaching: "الهيئة التعليمية", administrative: "الهيئة الإدارية", support: "الهيئة المساندة" };
boot("access.html", async (m, c) => {
  const [cats, titles, ro, pe, sy] = await Promise.all([sb.from("staff_categories").select("*").order("sort_order"), sb.from("job_titles").select("*").eq("is_active", true),
    sb.from("roles").select("*"), sb.from("permissions").select("*").order("code"), sb.rpc("system_names")]);
  const C = cats.data || [], T = titles.data || [];
  const R = Object.fromEntries((ro.data || []).map((x) => [x.code, x])), PL = pe.data || [], P = Object.fromEntries(PL.map((x) => [x.code, x])), SY = Object.fromEntries((sy.data || []).map((x) => [x.code, x.name_ar]));
  const isCore = (p) => !p.system_code, canAdd = true, canEdit = true, canContact = true; // الصفحة كلها لإدارة المستخدمين
  const PROT = ["core_admin", "principal"], prot = (r) => (r.staff_roles || []).some((x) => !x.ended_on && PROT.includes(x.role_code));
  const lock = (r) => !c.isAdmin && prot(r); // حساب مدير النواة/المدرسة لا يعدّله إلا مدير النواة
  const SEL = "*,job_titles(name_ar),staff_categories(name_ar),staff_roles(id,role_code,system_code,started_on,ended_on),staff_permissions(permission_code)";
  const LIVE = ["active", "on_leave"];
  let rows = [], priv = {};
  async function load() {
    const r = await sb.from("staff_members").select(SEL).order("full_name"); rows = r.data || [];
    const p = await sb.from("staff_private").select("*"); priv = Object.fromEntries((p.data || []).map((x) => [x.staff_id, x]));
  }
  await load();
  const label = (r) => `${R[r.role_code]?.name_ar || r.role_code}${r.system_code ? " · " + (SY[r.system_code] || r.system_code) : ""}`;
  function paint() {
    m.innerHTML = head("المستخدمون والصلاحيات", "كل تعديل على المستخدمين من هنا: البيانات والحالة والحساب والأدوار والصلاحيات. أما «المنسوبون» فيعرض العاملين الحاليين دون تعديل.") +
      `<div class="bar"><input id="q" placeholder="بحث بالاسم أو التخصص أو القسم"><select id="fc"><option value="">كل الفئات</option>${C.map((x) => `<option value="${x.code}">${esc(x.name_ar)}</option>`).join("")}</select>
       <select id="fe"><option value="">كل الحالات</option><option value="_live">فعّالون (على رأس العمل / في إجازة)</option><option value="_off">غير فعّالين (منقول / منتهٍ / متقاعد / مؤرشف)</option>${opts(L.emp)}</select>
       <select id="fa"><option value="">كل الحسابات</option>${opts(L.acct)}</select>
       <button class="btn" id="add">إضافة مستخدم</button><button class="btn sec" id="imp">استيراد Excel</button><button class="btn sec" id="ex">تصدير Excel</button><button class="btn sec" id="hs">سجل التغييرات</button></div>
       <div id="impbox"></div><div class="tw"><table><thead><tr><th>الاسم</th><th>الفئة</th><th>المسمى</th><th>الحالة الوظيفية</th><th>الحساب</th><th>الأدوار والصلاحيات</th><th></th></tr></thead><tbody id="tb"></tbody></table></div><p class="sub" id="cnt"></p>`;
    const fc = m.querySelector("#fc"); if (qs("cat")) fc.value = qs("cat");
    ["q", "fc", "fe", "fa"].forEach((i) => m.querySelector("#" + i).addEventListener("input", draw)); draw();
    m.querySelector("#add").onclick = () => form(null); m.querySelector("#imp").onclick = openImport;
    m.querySelector("#hs").onclick = () => showHistory("staff_members", null, "سجل المستخدمين");
    m.querySelector("#ex").onclick = () => exportXlsx("المستخدمون", ["الاسم", "الفئة", "المسمى", "التخصص", "المؤهل", "القسم", "الحالة الوظيفية", "الحساب", "تاريخ الانضمام", "الرقم الوظيفي", "معرّف الدخول", "البريد", "الجوال"],
      filtered().map((r) => [r.full_name, r.staff_categories?.name_ar, r.job_titles?.name_ar, r.specialty, r.qualification, r.department, L.emp[r.employment_status], L.acct[r.account_status], r.joined_on, priv[r.id]?.employee_no, priv[r.id]?.login_id, priv[r.id]?.email, priv[r.id]?.phone]));
    m.addEventListener("click", (e) => { const b = e.target.closest("button[data-d],button[data-e],button[data-a],button[data-p]"); if (!b) return; const f = (k) => rows.find((x) => x.id === b.dataset[k]);
      if (b.dataset.d) details(f("d")); if (b.dataset.e) form(f("e")); if (b.dataset.a) account(f("a")); if (b.dataset.p) manage(f("p")); });
    m.addEventListener("change", (e) => { const s = e.target.closest("select[data-st]"); if (s) setStatus(rows.find((x) => x.id === s.dataset.st), s.value, s); });
  }
  // تغيير سريع للحالة الوظيفية من الجدول
  async function setStatus(r, v, el) {
    if (!r || v === r.employment_status) return;
    const off = !LIVE.includes(v);
    if (off && LIVE.includes(r.employment_status) && !confirm(`تغيير حالة «${r.full_name}» إلى «${L.emp[v]}»؟ سيختفي من المنسوبين ومن الموقع العام.`)) { el.value = r.employment_status; return; }
    const res = await sb.from("staff_members").update({ employment_status: v }).eq("id", r.id);
    if (res.error) { toast(mapErr(res.error), true); el.value = r.employment_status; return; }
    toast("تم تحديث الحالة"); await load(); draw();
  }
  function filtered() {
    const q = m.querySelector("#q").value.trim(), f = m.querySelector("#fc").value, s = m.querySelector("#fe").value, a = m.querySelector("#fa").value;
    return rows.filter((r) => (!q || r.full_name.includes(q) || (r.specialty || "").includes(q) || (r.department || "").includes(q)) && (!f || r.category === f)
      && (!s || (s === "_live" ? LIVE.includes(r.employment_status) : s === "_off" ? !LIVE.includes(r.employment_status) : r.employment_status === s)) && (!a || r.account_status === a));
  }
  function draw() {
    const list = filtered();
    m.querySelector("#tb").innerHTML = list.map((r) => { const ro2 = (r.staff_roles || []).filter((x) => !x.ended_on), np = (r.staff_permissions || []).length, lk = lock(r);
      return `<tr><td>${esc(r.full_name)}${lk ? ' <span class="badge" title="حساب محمي: يعدّله مدير النواة فقط">محمي</span>' : ""}</td><td>${esc(r.staff_categories?.name_ar)}</td><td>${esc(r.job_titles?.name_ar)}</td>
      <td><select data-st="${r.id}" ${lk ? "disabled" : ""} aria-label="الحالة الوظيفية">${opts(L.emp, r.employment_status)}</select>${r.publish_public ? ' <span class="badge" title="يظهر في الموقع العام">منشور</span>' : ""}</td>
      <td><span class="badge ${r.account_status === "active" ? "ok" : ""}">${L.acct[r.account_status]}</span></td>
      <td>${ro2.map((x) => `<span class="badge ok">${esc(label(x))}</span>`).join(" ")}${np ? ` <span class="badge">${np} صلاحية</span>` : ""}${!ro2.length && !np ? "—" : ""}</td>
      <td class="acts"><button class="btn sm sec" data-d="${r.id}">التفاصيل</button>${lk ? "" : `<button class="btn sm sec" data-e="${r.id}">تعديل</button><button class="btn sm sec" data-a="${r.id}">الحساب</button><button class="btn sm sec" data-p="${r.id}">الصلاحيات</button>`}</td></tr>`; }).join("") || '<tr><td colspan="7">لا توجد نتائج.</td></tr>';
    m.querySelector("#cnt").textContent = `${list.length} من ${rows.length} مستخدم`;
  }

  async function details(r) {
    const p = priv[r.id] || {}, img = await signed(r.photo_path);
    const md = modal(`<h3>${esc(r.full_name)}</h3><div class="row2" style="align-items:flex-start;gap:16px">${img ? `<img src="${img}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:12px">` : ""}<div class="fg" style="flex:1">
      ${[["الفئة", r.staff_categories?.name_ar], ["المسمى", r.job_titles?.name_ar], ["التخصص", r.specialty], ["المؤهل", r.qualification], ["القسم", r.department], ["الحالة الوظيفية", L.emp[r.employment_status]], ["الحساب", L.acct[r.account_status]], ["النشر في الموقع العام", r.publish_public ? "منشور" : "غير منشور"], ["تاريخ الانضمام", fmt(r.joined_on)], ["الرقم الوظيفي", p.employee_no], ["معرّف الدخول", p.login_id], ["البريد", p.email], ["الجوال", p.phone]]
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
      ${canContact ? `<div><label>الرقم الوظيفي</label><input name="employee_no" value="${esc(p.employee_no)}"></div><div><label>البريد الإلكتروني</label><input type="email" name="email" value="${esc(p.email)}"${r?.user_id && !p.login_id ? " readonly title=\"بريد الدخول: يُغيَّر من نافذة الحساب\"" : ""}></div><div><label>الجوال</label><input name="phone" value="${esc(p.phone)}"></div>` : ""}
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
    const p = priv[r.id] || {}, byId = !!p.login_id, S = 'dir="ltr" autocapitalize="none" autocorrect="off" spellcheck="false"';
    const gen = () => { const a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return [...crypto.getRandomValues(new Uint32Array(12))].map((x) => a[x % a.length]).join(""); };
    const row = (id, label, field, btns, hint) => `<div class="acr"><label for="${id}">${label}</label><div class="bar">${field}${btns}</div>${hint ? `<small class="sub">${hint}</small>` : ""}</div>`;
    const html = r.user_id
      ? `<h3>إدارة الحساب</h3><p>الحالة: <b>${L.acct[r.account_status]}</b> · الدخول بـ: <b>${byId ? "معرّف" : "بريد إلكتروني"}</b></p>
        ${row("nm", "الاسم الكامل", `<input id="nm" value="${esc(r.full_name)}" maxlength="200">`, '<button class="btn" id="snm">حفظ الاسم</button>')}
        ${row("nl", "معرّف الدخول", `<input id="nl" ${S} value="${esc(p.login_id)}" placeholder="${byId ? "" : "اكتب معرّفاً لتحويل الدخول من البريد إلى معرّف"}">`, '<button class="btn" id="sl">حفظ المعرّف</button>', "أرقام أو حروف إنجليزية، من 3 إلى 40 خانة، ويمكن استخدام . _ -")}
        ${row("ne", "البريد الإلكتروني", `<input id="ne" type="email" ${S} value="${esc(p.email)}" placeholder="اختياري">`, '<button class="btn" id="se">حفظ البريد</button>', byId ? "للتواصل فقط، ولا يؤثر على الدخول." : "هذا الحساب يدخل بالبريد، فتغييره يغيّر بريد الدخول أيضاً.")}
        ${row("np", "كلمة مرور جديدة", `<input id="np" type="password" ${S} autocomplete="new-password" placeholder="10 أحرف على الأقل">`, '<button class="btn sec" id="gp" type="button">توليد</button><button class="btn" id="rp">تعيين</button>', "«توليد» تنشئ كلمة قوية وتعرضها لتسلّمها للمنسوب قبل التعيين.")}
        <div class="acts"><button class="btn ${r.account_status === "suspended" ? "" : "bad"}" id="tg">${r.account_status === "suspended" ? "تفعيل الحساب" : "إيقاف الحساب"}</button><button class="btn sec" id="cl">إغلاق</button></div>
        <p class="err" id="ae2"></p>`
      : `<h3>إنشاء حساب: ${esc(r.full_name)}</h3>
        ${row("ae", "معرّف الدخول", `<input id="ae" ${S} placeholder="مثال: 1012345 أو t.salem">`, "", "أرقام أو حروف إنجليزية، من 3 إلى 40 خانة")}
        ${row("ap", "كلمة المرور المؤقتة", `<input id="ap" type="password" ${S} autocomplete="new-password" placeholder="10 أحرف على الأقل">`, '<button class="btn sec" id="gp" type="button">توليد</button>')}
        ${row("ac", "البريد الإلكتروني (اختياري)", `<input id="ac" type="email" ${S} value="${esc(p.email)}">`, "", "للتواصل فقط")}
        <div class="acts"><button class="btn" id="mk">إنشاء الحساب</button><button class="btn sec" id="cl">إغلاق</button></div><p class="err" id="ae2"></p>`;
    const md = modal(html);
    const g = (i) => md.el.querySelector(i);
    const msg = (t, bad) => { g("#ae2").textContent = bad ? t : ""; if (!bad) toast(t); };
    // يحفظ ثم يعيد فتح النافذة بالقيم الجديدة ليتابع المدير تعديلاً آخر دون عودة للقائمة
    const run = (fn, ok = "تم الحفظ", reopen = true) => async () => { try { await fn(); await load(); draw(); if (reopen) { md.close(); account(rows.find((x) => x.id === r.id)); } toast(ok); } catch (e) { msg(e.message || mapErr(e), true); } };
    g("#cl").onclick = md.close;
    if (g("#gp")) g("#gp").onclick = () => { const f = g("#np") || g("#ap"); f.type = "text"; f.value = gen(); };
    if (g("#mk")) g("#mk").onclick = run(() => api("/admin/create-account", { staff_id: r.id, login_id: g("#ae").value, password: g("#ap").value, contact_email: g("#ac").value }), "تم إنشاء الحساب");
    if (!r.user_id) return;
    g("#snm").onclick = run(async () => { const v = g("#nm").value.trim(); if (v.length < 2 || v.length > 200) throw new Error("الاسم من حرفين إلى 200 حرف"); const res = await sb.from("staff_members").update({ full_name: v }).eq("id", r.id); if (res.error) throw res.error; });
    g("#sl").onclick = run(() => api("/admin/set-login-id", { staff_id: r.id, login_id: g("#nl").value }));
    g("#se").onclick = run(() => api("/admin/set-email", { staff_id: r.id, email: g("#ne").value }));
    g("#rp").onclick = run(() => api("/admin/reset-password", { staff_id: r.id, password: g("#np").value }), "تم تعيين كلمة المرور", false);
    g("#tg").onclick = run(() => api("/admin/set-status", { staff_id: r.id, status: r.account_status === "suspended" ? "active" : "suspended" }), "تم");
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
  // الأدوار والصلاحيات: لا يمنح غير مدير النواة دور مدير النواة/المدرسة ولا صلاحية «إدارة المستخدمين الكاملة» (وتفرضه قاعدة البيانات أيضاً)
  function manage(s) {
    const roleList = Object.values(R).filter((r) => c.isAdmin || !PROT.includes(r.code));
    const pOpts = (list) => list.filter((p) => c.isAdmin || p.code !== "users:manage").map((p) => `<option value="${p.code}">${esc(p.name_ar)}${p.system_code ? " · " + esc(SY[p.system_code] || p.system_code) : ""}</option>`).join("");
    const act = (s.staff_roles || []).filter((r) => !r.ended_on), perms = s.staff_permissions || [];
    const md = modal(`<h3>الأدوار والصلاحيات: ${esc(s.full_name)}</h3><p><small>الوظيفة: ${esc(s.job_titles?.name_ar)} (لا تحدد الصلاحيات وحدها)</small></p>
      <h3 class="sec">الأدوار</h3>${act.map((r) => `<div class="row2 item"><span>${esc(label(r))}</span><button class="btn sm bad" data-er="${r.id}" ${!c.isAdmin && PROT.includes(r.role_code) ? "disabled" : ""}>إنهاء</button></div>`).join("") || '<p class="sub">لا توجد أدوار نشطة.</p>'}
      <div class="fg mt"><div><label>الدور</label><select id="rc">${roleList.map((r) => `<option value="${r.code}">${esc(r.name_ar)}</option>`).join("")}</select></div><div><label>خاص بنظام</label><select id="rs"><option value="">النواة</option>${opts(SY)}</select></div></div><button class="btn mt" id="ar">إضافة الدور</button>
      <h3 class="sec">الصلاحيات الممنوحة</h3>${perms.map((p) => `<div class="row2 item"><span>${esc(P[p.permission_code]?.name_ar || p.permission_code)} <small>${P[p.permission_code]?.system_code ? esc(SY[P[p.permission_code].system_code] || "") : "النواة"}</small></span><button class="btn sm bad" data-rp="${esc(p.permission_code)}" ${!c.isAdmin && p.permission_code === "users:manage" ? "disabled" : ""}>سحب</button></div>`).join("") || '<p class="sub">لا توجد صلاحيات ممنوحة.</p>'}
      <div class="fg mt"><div class="full"><label>صلاحية على سجلات النواة</label><select id="pc">${pOpts(PL.filter(isCore))}</select></div></div><button class="btn mt" id="ap">منح صلاحية النواة</button>
      <div class="fg mt"><div class="full"><label>صلاحية نظام مستقل</label><select id="pc2">${pOpts(PL.filter((p) => !isCore(p)))}</select></div></div><button class="btn mt" id="ap2">منح صلاحية النظام</button>
      <p class="err" id="fe"></p><div class="acts mt"><button class="btn sec" id="cx">إغلاق</button></div>`);
    const g = (i) => md.el.querySelector(i), done = async () => { md.close(); await load(); draw(); manage(rows.find((x) => x.id === s.id)); };
    g("#cx").onclick = md.close;
    g("#ar").onclick = async () => { const r = await sb.from("staff_roles").insert({ staff_id: s.id, role_code: g("#rc").value, system_code: nn(g("#rs").value) }); r.error ? (g("#fe").textContent = mapErr(r.error)) : done(); };
    const grant = (sel) => async () => { const r = await sb.from("staff_permissions").insert({ staff_id: s.id, permission_code: g(sel).value }); r.error ? (g("#fe").textContent = /duplicate/.test(r.error.message) ? "الصلاحية ممنوحة بالفعل." : mapErr(r.error)) : done(); };
    g("#ap").onclick = grant("#pc"); g("#ap2").onclick = grant("#pc2");
    md.el.querySelectorAll("[data-er]").forEach((b) => (b.onclick = async () => { const r = await sb.from("staff_roles").update({ ended_on: today() }).eq("id", b.dataset.er); r.error ? (g("#fe").textContent = mapErr(r.error)) : done(); }));
    md.el.querySelectorAll("[data-rp]").forEach((b) => (b.onclick = async () => { const r = await sb.from("staff_permissions").delete().eq("staff_id", s.id).eq("permission_code", b.dataset.rp); r.error ? (g("#fe").textContent = mapErr(r.error)) : done(); }));
  }

  paint();
}, { perm: "users:manage" });
