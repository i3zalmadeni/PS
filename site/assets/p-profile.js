boot("profile.html", async (m, c) => {
  const id = qs("id") || c.me.id, own = id === c.me.id, can = own || c.isAdmin;
  const sel = await sb.from("staff_members").select("*,job_titles(name_ar),staff_categories(name_ar),staff_teaching(*)").eq("id", id).maybeSingle();
  const s = sel.data; if (!s) { m.innerHTML = '<p class="err">الملف غير موجود.</p>'; return; }
  const te = s.category === "teaching";
  let tab = "profile", prof = {}, items = [], recs = [], teams = [], hist = [], priv = null;
  async function load() {
    const [a, b, d, e, f, g] = await Promise.all([
      sb.from("staff_profiles").select("*").eq("staff_id", id).maybeSingle(), sb.from("staff_profile_items").select("*").eq("staff_id", id).order("date_from", { ascending: false, nullsFirst: false }),
      sb.from("professional_records").select("*").eq("staff_id", id).order("record_date", { ascending: false, nullsFirst: false }),
      sb.from("team_memberships").select("*,teams(id,name,type_code,status)").eq("staff_id", id).order("started_on", { ascending: false }),
      can ? sb.from("staff_position_history").select("*").eq("staff_id", id).order("started_on", { ascending: false }) : { data: [] },
      can ? sb.from("staff_private").select("*").eq("staff_id", id).maybeSingle() : { data: null }]);
    prof = a.data || {}; items = b.data || []; recs = d.data || []; teams = e.data || []; hist = f.data || []; priv = g.data;
  }
  await load();
  const tabs = [["profile", "الملف المهني"], ["domains", "المجالات المهنية"], ["teams", "الفرق"], ...(can ? [["hist", "السجل الوظيفي"]] : [])];
  function paint() {
    m.innerHTML = `<div class="row2"><div>${head(s.full_name, `${s.staff_categories?.name_ar || ""} · ${s.job_titles?.name_ar || ""}${s.specialty ? " · " + s.specialty : ""}`)}</div>${own ? "" : '<a class="btn sec" href="staff.html">المنسوبون</a>'}</div>
      <div class="tabs">${tabs.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${n}</button>`).join("")}</div><div id="body"></div>`;
    m.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => { tab = b.dataset.t; paint(); }));
    ({ profile: pProfile, domains: pDomains, teams: pTeams, hist: pHist })[tab](document.getElementById("body"));
  }
  function pProfile(b) {
    const tc = s.staff_teaching || {};
    b.innerHTML = `<div class="card"><div class="row2"><h3 class="sec" style="margin:0">التعريف المهني</h3>${can ? '<button class="btn sm sec" id="eb">تعديل</button>' : ""}</div>
      <p>${esc(prof.bio || "لا توجد نبذة.")}</p>${(prof.interests || []).length ? `<p>الاهتمامات: ${prof.interests.map((x) => `<span class="badge">${esc(x)}</span>`).join(" ")}</p>` : ""}
      <p><small>المؤهل: ${esc(s.qualification || "—")} · الانضمام: ${fmt(s.joined_on)}${te ? ` · المرحلة: ${esc(tc.stage || "—")} · المواد: ${esc((tc.subjects || []).join("، ") || "—")} · الصفوف: ${esc((tc.grades || []).join("، ") || "—")}` : ""}</small></p>
      ${priv ? `<p><small>بيانات خاصة (تظهر لك وللإدارة فقط): الرقم الوظيفي ${esc(priv.employee_no || "—")} · ${esc(priv.email || "—")} · ${esc(priv.phone || "—")}</small></p>` : ""}</div>
      ${can ? '<div class="mt"><button class="btn" id="ai">إضافة سجل</button></div>' : ""}
      ${Object.entries(L.section).map(([k, n]) => { const li = items.filter((x) => x.section === k); return li.length || can ? `<h3 class="sec">${n}</h3>${li.map(itemHtml).join("") || '<p class="sub">لا توجد سجلات.</p>'}` : ""; }).join("")}
      <p class="sub">السجلات غير المعتمدة تظهر بحالتها، والسجل الخاص لا يراه غيرك والإدارة.</p>`;
    if (can) { b.querySelector("#eb").onclick = editProfile; b.querySelector("#ai").onclick = () => itemForm(null); }
    b.querySelectorAll("[data-ie]").forEach((x) => (x.onclick = () => itemForm(items.find((i) => i.id === x.dataset.ie))));
    b.querySelectorAll("[data-id]").forEach((x) => (x.onclick = async () => { if (!confirm("حذف السجل؟")) return; const r = await sb.from("staff_profile_items").delete().eq("id", x.dataset.id); r.error ? toast(mapErr(r.error), true) : (await load(), paint()); }));
    b.querySelectorAll("[data-is]").forEach((x) => (x.onclick = async () => { const r = await sb.from("staff_profile_items").update({ verification_status: "submitted" }).eq("id", x.dataset.is); r.error ? toast(mapErr(r.error), true) : (toast("قُدِّم للاعتماد"), await load(), paint()); }));
    b.querySelectorAll("[data-ir]").forEach((x) => (x.onclick = () => review(items.find((i) => i.id === x.dataset.ir))));
    b.querySelectorAll("[data-if]").forEach((x) => (x.onclick = async () => { const r = await sb.storage.from("staff-evidence").createSignedUrl(x.dataset.if, 120); r.error ? toast("تعذر فتح الملف", true) : window.open(r.data.signedUrl, "_blank", "noopener"); }));
  }
  function itemHtml(i) {
    return `<div class="item"><div class="row2"><div><b>${esc(i.title)}</b> ${vbadge(i.verification_status)}${i.visibility === "private" ? ' <span class="badge">خاص</span>' : ""}<br><small>${esc(i.issuer || "")} ${i.date_from ? fmt(i.date_from) : ""}${i.date_to ? " – " + fmt(i.date_to) : ""}</small></div>
      <div class="acts">${i.file_path && can ? `<button class="btn sm sec" data-if="${esc(i.file_path)}">المرفق</button>` : ""}
      ${can && ["draft", "needs_revision", "rejected"].includes(i.verification_status) ? `<button class="btn sm" data-is="${i.id}">تقديم للاعتماد</button>` : ""}
      ${c.isAdmin ? `<button class="btn sm sec" data-ir="${i.id}">مراجعة</button>` : ""}${can ? `<button class="btn sm sec" data-ie="${i.id}">تعديل</button><button class="btn sm bad" data-id="${i.id}">حذف</button>` : ""}</div></div>
      ${i.details ? `<p>${esc(i.details)}</p>` : ""}${i.review_note ? `<p><small>ملاحظة المراجعة: ${esc(i.review_note)}</small></p>` : ""}</div>`;
  }
  function editProfile() {
    const md = modal(`<h3>تعديل التعريف المهني</h3><form id="pf"><label>نبذة مهنية</label><textarea name="bio" maxlength="3000">${esc(prof.bio)}</textarea><label>الاهتمامات (افصل بفاصلة)</label><input name="interests" value="${esc((prof.interests || []).join("، "))}">
      <div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
    md.el.querySelector("#cx").onclick = md.close;
    md.el.querySelector("#pf").onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
      const r = await sb.from("staff_profiles").upsert({ staff_id: id, bio: nn(v.bio.trim()), interests: v.interests.split(/[،,]/).map((x) => x.trim()).filter(Boolean), updated_at: new Date().toISOString() }, { onConflict: "staff_id" });
      if (r.error) { toast(mapErr(r.error), true); return; } md.close(); await load(); paint(); };
  }
  function itemForm(i) {
    const md = modal(`<h3>${i ? "تعديل سجل" : "إضافة سجل"}</h3><form id="if"><div class="fg">
      <div><label>القسم *</label><select name="section">${opts(L.section, i?.section)}</select></div><div><label>الظهور</label><select name="visibility"><option value="community" ${i?.visibility !== "private" ? "selected" : ""}>لأعضاء المجتمع</option><option value="private" ${i?.visibility === "private" ? "selected" : ""}>خاص بي والإدارة</option></select></div>
      <div class="full"><label>العنوان *</label><input name="title" required minlength="2" value="${esc(i?.title)}"></div><div class="full"><label>التفاصيل</label><textarea name="details">${esc(i?.details)}</textarea></div>
      <div><label>الجهة</label><input name="issuer" value="${esc(i?.issuer)}"></div><div></div><div><label>من</label><input type="date" name="date_from" value="${esc(i?.date_from)}"></div><div><label>إلى</label><input type="date" name="date_to" value="${esc(i?.date_to)}"></div>
      <div class="full"><label>مرفق (PDF أو صورة أو Word، حتى 10 ميجابايت؛ المرفقات خاصة بك وبالإدارة)</label><input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"></div></div>
      <p class="err" id="fe"></p><div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
    md.el.querySelector("#cx").onclick = md.close;
    md.el.querySelector("#if").onsubmit = async (e) => {
      e.preventDefault(); const f = new FormData(e.target), v = Object.fromEntries(f), er = md.el.querySelector("#fe"); er.textContent = "";
      const row = { staff_id: id, section: v.section, visibility: v.visibility, title: v.title.trim(), details: nn(v.details.trim()), issuer: nn(v.issuer.trim()), date_from: nn(v.date_from), date_to: nn(v.date_to) };
      const file = f.get("file");
      if (file && file.size) {
        if (file.size > 10 * 1024 * 1024) { er.textContent = "المرفق أكبر من 10 ميجابايت"; return; }
        const path = `${id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`; const up = await sb.storage.from("staff-evidence").upload(path, file);
        if (up.error) { er.textContent = "تعذر رفع المرفق: نوع الملف أو حجمه غير مسموح."; return; } row.file_path = path; row.file_name = file.name;
      }
      const r = i ? await sb.from("staff_profile_items").update(row).eq("id", i.id) : await sb.from("staff_profile_items").insert(row);
      if (r.error) { er.textContent = mapErr(r.error); return; } md.close(); toast("تم الحفظ"); await load(); paint();
    };
  }
  function review(i) {
    const md = modal(`<h3>مراجعة: ${esc(i.title)}</h3><label>القرار</label><select id="d"><option value="under_review">قيد المراجعة</option><option value="approved">اعتماد</option><option value="needs_revision">يحتاج إلى استكمال</option><option value="rejected">رفض</option></select>
      <label>ملاحظة (إلزامية عند الرفض أو الاستكمال)</label><textarea id="n"></textarea><div class="acts mt"><button class="btn" id="ok">تنفيذ</button><button class="btn sec" id="cx">إلغاء</button></div>`);
    md.el.querySelector("#cx").onclick = md.close;
    md.el.querySelector("#ok").onclick = async () => { const d = md.el.querySelector("#d").value, n = md.el.querySelector("#n").value.trim();
      if (["rejected", "needs_revision"].includes(d) && !n) { toast("اكتب سبب القرار", true); return; }
      const r = await sb.from("staff_profile_items").update({ verification_status: d, review_note: nn(n) }).eq("id", i.id); if (r.error) { toast(mapErr(r.error), true); return; } md.close(); await load(); paint(); };
  }
  function pDomains(b) {
    b.innerHTML = Object.entries(L.domain).filter(([k]) => k !== "teaching_practice" || te).map(([k, n]) => { const li = recs.filter((x) => x.domain === k);
      return `<h3 class="sec">${n}</h3>${can ? `<button class="btn sm sec" data-ad="${k}">إضافة</button>` : ""}${li.map((r) => `<div class="item"><div class="row2"><b>${esc(r.title)}</b><small>${fmt(r.record_date)}${r.source_system ? " · من نظام: " + esc(r.source_system) : ""}</small></div>${r.details ? `<p>${esc(r.details)}</p>` : ""}${can ? `<button class="btn sm bad" data-dr="${r.id}">حذف</button>` : ""}</div>`).join("") || '<p class="sub">لا توجد سجلات.</p>'}`; }).join("") +
      `<p class="sub">الممارسات التعليمية خاصة بالوظائف التعليمية، أما النمو المهني والأداء والإنجاز فمتاحان لجميع الفئات. وتظهر هنا مخرجات الأنظمة المرتبطة عند ربطها.</p>`;
    b.querySelectorAll("[data-ad]").forEach((x) => (x.onclick = () => {
      const md = modal(`<h3>${L.domain[x.dataset.ad]}</h3><form id="rf"><label>العنوان *</label><input name="title" required minlength="2"><label>التفاصيل</label><textarea name="details"></textarea><label>التاريخ</label><input type="date" name="d" value="${today()}"><div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
      md.el.querySelector("#cx").onclick = md.close;
      md.el.querySelector("#rf").onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); const r = await sb.from("professional_records").insert({ staff_id: id, domain: x.dataset.ad, title: v.title.trim(), details: nn(v.details.trim()), record_date: nn(v.d) }); if (r.error) { toast(mapErr(r.error), true); return; } md.close(); await load(); paint(); };
    }));
    b.querySelectorAll("[data-dr]").forEach((x) => (x.onclick = async () => { if (!confirm("حذف السجل؟")) return; await sb.from("professional_records").delete().eq("id", x.dataset.dr); await load(); paint(); }));
  }
  function pTeams(b) {
    b.innerHTML = `<div class="tw"><table><thead><tr><th>الفريق</th><th>الدور</th><th>من</th><th>إلى</th></tr></thead><tbody>${teams.map((t) => `<tr><td><a href="team.html?id=${t.teams.id}">${esc(t.teams.name)}</a></td><td>${L.member[t.member_role]}</td><td>${fmt(t.started_on)}</td><td>${t.ended_on ? fmt(t.ended_on) : '<span class="badge ok">نشطة</span>'}</td></tr>`).join("") || '<tr><td colspan="4">لا توجد عضويات.</td></tr>'}</tbody></table></div>`;
  }
  function pHist(b) {
    const J = { teacher: "معلم" };
    b.innerHTML = `<div class="tw"><table><thead><tr><th>الفئة</th><th>المسمى</th><th>من</th><th>إلى</th></tr></thead><tbody>${hist.map((h) => `<tr><td>${esc(h.category)}</td><td>${esc(J[h.job_title] || h.job_title)}</td><td>${fmt(h.started_on)}</td><td>${h.ended_on ? fmt(h.ended_on) : "الحالي"}</td></tr>`).join("")}</tbody></table></div>`;
  }
  paint();
});
