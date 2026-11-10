boot("facilities.html", async (m, c) => {
  const canAdd = c.can("facilities:add"), canEdit = c.can("facilities:edit");
  const [ft, st] = await Promise.all([sb.from("facility_types").select("*").order("sort_order"), sb.from("staff_members").select("id,full_name").eq("is_active", true).order("full_name")]);
  const FT = ft.data || [], ST = st.data || [], FN_ = Object.fromEntries(FT.map((t) => [t.code, t.name_ar])), SN = Object.fromEntries(ST.map((s) => [s.id, s.full_name]));
  let rows = [];
  async function load() { const r = await sb.from("facilities").select("*").order("code"); rows = r.data || []; }
  await load();
  const filtered = () => { const q = m.querySelector("#q").value.trim(), t = m.querySelector("#ftp").value, s = m.querySelector("#fst").value; return rows.filter((r) => (!q || r.name.includes(q) || (r.building || "").includes(q) || (r.code || "").includes(q)) && (!t || r.type_code === t) && (!s || r.status === s)); };
  function paint() {
    m.innerHTML = head("سجل المرافق", "الهوية الثابتة للمرافق ومواقعها والمسؤولون عنها وتجهيزاتها، دون الحجوزات والصيانة") +
      `<div class="bar"><input id="q" placeholder="بحث بالاسم أو المبنى أو الرمز"><select id="ftp"><option value="">كل الأنواع</option>${FT.map((t) => `<option value="${t.code}">${esc(t.name_ar)}</option>`).join("")}</select><select id="fst"><option value="">كل الحالات</option>${opts(L.fstatus)}</select>
       ${canAdd ? '<button class="btn" id="add">إضافة مرفق</button><button class="btn sec" id="imp">استيراد Excel</button>' : ""}<button class="btn sec" id="ex">تصدير Excel</button><button class="btn sec" id="hs">سجل التغييرات</button></div>
      <div id="impbox"></div><div class="tw"><table><thead><tr><th>الرمز</th><th>الاسم</th><th>النوع</th><th>الموقع</th><th>الطاقة</th><th>الحالة</th><th></th></tr></thead><tbody id="tb"></tbody></table></div><p class="sub" id="cnt"></p>`;
    ["q", "ftp", "fst"].forEach((i) => m.querySelector("#" + i).addEventListener("input", draw));
    if (canAdd) { m.querySelector("#add").onclick = () => form(null); m.querySelector("#imp").onclick = openImport; }
    m.querySelector("#hs").onclick = () => showHistory("facilities", null, "سجل المرافق");
    m.querySelector("#ex").onclick = () => exportXlsx("سجل-المرافق", ["الرمز", "الاسم", "النوع", "المبنى", "الدور", "الغرفة", "المساحة", "الطاقة", "الحالة", "المسؤول الرئيسي", "المسؤول البديل"], filtered().map((r) => [r.code, r.name, FN_[r.type_code], r.building, r.floor, r.room_no, r.area_m2, r.capacity, L.fstatus[r.status], SN[r.primary_staff_id], SN[r.backup_staff_id]]));
    m.querySelector("#tb").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; const r = rows.find((x) => x.id === b.dataset.id); b.dataset.k === "d" ? details(r) : form(r); };
    draw();
  }
  const loc = (r) => [r.building, r.floor && "دور " + r.floor, r.room_no && "غرفة " + r.room_no].filter(Boolean).join(" · ") || "—";
  function draw() {
    const l = filtered();
    m.querySelector("#tb").innerHTML = l.map((r) => `<tr><td>${esc(r.code)}</td><td>${esc(r.name)}</td><td>${esc(FN_[r.type_code] || "—")}</td><td>${esc(loc(r))}</td><td>${r.capacity ?? "—"}</td><td><span class="badge ${r.status === "operational" ? "ok" : r.status === "closed" ? "bad" : ""}">${L.fstatus[r.status]}</span></td>
      <td class="acts"><button class="btn sm sec" data-k="d" data-id="${r.id}">التفاصيل</button>${canEdit ? `<button class="btn sm sec" data-k="e" data-id="${r.id}">تعديل</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="7">لا توجد نتائج.</td></tr>';
    m.querySelector("#cnt").textContent = `${l.length} من ${rows.length} مرفق`;
  }

  async function details(r) {
    const [eq, imgs] = await Promise.all([sb.from("facility_equipment").select("*").eq("facility_id", r.id).order("name"), Promise.all((r.photo_paths || []).map(signed))]);
    const md = modal(`<h3>${esc(r.name)} <small>${esc(r.code)}</small></h3><div class="fg">${[["النوع", FN_[r.type_code]], ["الموقع", loc(r)], ["ملاحظة الموقع", r.location_note], ["المساحة (م²)", r.area_m2], ["الطاقة الاستيعابية", r.capacity], ["الحالة", L.fstatus[r.status]], ["المسؤول الرئيسي", SN[r.primary_staff_id]], ["المسؤول البديل", SN[r.backup_staff_id]], ["الوصف", r.description]].map(([k, v]) => `<div><small class="sub">${k}</small><br><b>${esc(v ?? "—")}</b></div>`).join("")}</div>
      ${imgs.filter(Boolean).length ? `<div class="acts mt">${imgs.filter(Boolean).map((u) => `<img src="${u}" alt="" style="width:120px;height:90px;object-fit:cover;border-radius:10px">`).join("")}</div>` : ""}
      <h3 class="sec">التجهيزات</h3><div id="eqs">${(eq.data || []).map((e) => `<div class="row2 item"><span>${esc(e.name)} × ${e.quantity}</span>${canEdit ? `<button class="btn sm sec" data-x="${e.id}">حذف</button>` : ""}</div>`).join("") || '<p class="sub">لا توجد تجهيزات مسجلة.</p>'}</div>
      ${canEdit ? '<form id="ef" class="bar mt"><input name="name" placeholder="اسم التجهيز" required><input name="quantity" type="number" min="1" value="1" style="width:90px"><button class="btn sm">إضافة</button></form>' : ""}
      <div class="acts mt"><button class="btn sec" id="h">سجل التغييرات</button><button class="btn sec" id="cx">إغلاق</button></div>`, true);
    const reopen = () => { md.close(); details(r); };
    md.el.querySelector("#cx").onclick = md.close; md.el.querySelector("#h").onclick = () => showHistory("facilities", r.id, r.name);
    md.el.querySelectorAll("[data-x]").forEach((b) => (b.onclick = async () => { const x = await sb.from("facility_equipment").delete().eq("id", b.dataset.x); x.error ? toast(mapErr(x.error), true) : reopen(); }));
    const ef = md.el.querySelector("#ef"); if (ef) ef.onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(ef)); const x = await sb.from("facility_equipment").insert({ facility_id: r.id, name: v.name.trim(), quantity: Number(v.quantity) || 1 }); x.error ? toast(mapErr(x.error), true) : reopen(); };
  }

  function form(r) {
    if (r ? !canEdit : !canAdd) return;
    const so = (sel) => '<option value="">—</option>' + ST.map((s) => `<option value="${s.id}" ${s.id === sel ? "selected" : ""}>${esc(s.full_name)}</option>`).join("");
    const md = modal(`<h3>${r ? "تعديل مرفق" : "إضافة مرفق"}</h3><form id="f"><div class="fg">
      <div class="full"><label>اسم المرفق *</label><input name="name" required value="${esc(r?.name)}"></div>
      <div><label>النوع *</label><select name="type_code" required>${FT.map((t) => `<option value="${t.code}" ${t.code === r?.type_code ? "selected" : ""}>${esc(t.name_ar)}</option>`).join("")}</select></div>
      <div><label>الحالة</label><select name="status">${opts(L.fstatus, r?.status || "operational")}</select></div>
      <div><label>المبنى</label><input name="building" value="${esc(r?.building)}"></div><div><label>الدور</label><input name="floor" value="${esc(r?.floor)}"></div><div><label>رقم الغرفة</label><input name="room_no" value="${esc(r?.room_no)}"></div>
      <div><label>المساحة (م²)</label><input type="number" step="any" min="0" name="area_m2" value="${esc(r?.area_m2)}"></div><div><label>الطاقة الاستيعابية</label><input type="number" min="0" name="capacity" value="${esc(r?.capacity)}"></div>
      <div><label>المسؤول الرئيسي</label><select name="primary_staff_id">${so(r?.primary_staff_id)}</select></div><div><label>المسؤول البديل</label><select name="backup_staff_id">${so(r?.backup_staff_id)}</select></div>
      <div class="full"><label>وصف الموقع</label><input name="location_note" value="${esc(r?.location_note)}"></div><div class="full"><label>الوصف</label><textarea name="description">${esc(r?.description)}</textarea></div>
      <div class="full"><label>إضافة صور (JPG/PNG/WebP، حتى 5 ميجابايت للصورة)</label><input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple></div>
      </div><p class="err" id="fe"></p><div class="acts mt"><button class="btn">حفظ</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`, true);
    md.el.querySelector("#cx").onclick = md.close;
    const f = md.el.querySelector("#f");
    f.onsubmit = async (e) => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(f)), err = md.el.querySelector("#fe"); err.textContent = "";
      if (v.primary_staff_id && v.primary_staff_id === v.backup_staff_id) { err.textContent = "المسؤول الرئيسي والبديل يجب أن يكونا شخصين مختلفين."; return; }
      const id = r?.id || crypto.randomUUID();
      const rec = { name: v.name.trim(), type_code: v.type_code, status: v.status, building: nn(v.building), floor: nn(v.floor), room_no: nn(v.room_no), area_m2: num(v.area_m2), capacity: num(v.capacity), primary_staff_id: nn(v.primary_staff_id), backup_staff_id: nn(v.backup_staff_id), location_note: nn(v.location_note), description: nn(v.description) };
      try {
        const files = [...f.photos.files]; if (files.length) rec.photo_paths = [...(r?.photo_paths || []), ...(await Promise.all(files.map((x) => uploadMedia("facilities", id, x))))];
        const x = r ? await sb.from("facilities").update(rec).eq("id", id) : await sb.from("facilities").insert({ ...rec, id, created_by: c.uid }); if (x.error) throw x.error;
      } catch (x) { err.textContent = mapErr(x); return; }
      md.close(); toast("تم الحفظ"); await load(); draw();
    };
  }

  function openImport() {
    const host = m.querySelector("#impbox"), tBy = (s) => FT.find((t) => t.name_ar === s || t.code === s), sBy = (s) => ST.find((x) => x.full_name === s);
    importUI(host, {
      registry: "facilities", label: "المرافق",
      fields: [["name", "اسم المرفق *", ["الاسم", "اسم المرفق"]], ["type", "النوع *", ["النوع"]], ["building", "المبنى", ["المبنى"]], ["floor", "الدور", ["الدور"]], ["room_no", "رقم الغرفة", ["رقم الغرفة", "الغرفة"]], ["area", "المساحة", ["المساحة"]], ["capacity", "الطاقة الاستيعابية", ["الطاقة", "الطاقة الاستيعابية", "السعة"]], ["primary", "المسؤول الرئيسي", ["المسؤول الرئيسي", "المسؤول"]], ["backup", "المسؤول البديل", ["المسؤول البديل", "البديل"]]],
      sample: ["معمل الحاسب", "معمل", "المبنى الرئيسي", "1", "12", "60", "30", "", ""],
      prepare: async () => ({ ex: rows.map((x) => ({ id: x.id, k: [x.name, x.building, x.room_no].join("|") })) }),
      plan: (get, cx, seen) => {
        const errs = [], name = String(get("name")).trim(), t = tBy(String(get("type")).trim()), b = nn(String(get("building"))), rn = nn(String(get("room_no"))), key = [name, b || "", rn || ""].join("|");
        const p1 = String(get("primary")).trim(), p2 = String(get("backup")).trim(), s1 = p1 && sBy(p1), s2 = p2 && sBy(p2);
        if (name.length < 2) errs.push("الاسم مطلوب"); if (!t) errs.push("نوع غير معروف"); if (p1 && !s1) errs.push("المسؤول الرئيسي غير موجود في سجل المنسوبين"); if (p2 && !s2) errs.push("المسؤول البديل غير موجود في سجل المنسوبين"); if (s1 && s2 && s1.id === s2.id) errs.push("الرئيسي والبديل متطابقان");
        if (seen.has(key)) errs.push("مكرر داخل الملف"); seen.add(key);
        return { errs, mid: cx.ex.find((x) => x.k === key)?.id, name, rec: { name, type_code: t?.code, building: b, floor: nn(String(get("floor"))), room_no: rn, area_m2: num(get("area")), capacity: num(get("capacity")), primary_staff_id: s1?.id || null, backup_staff_id: s2?.id || null } };
      },
      create: async (rec, cx, uid) => { const id = crypto.randomUUID(); const x = await sb.from("facilities").insert({ ...rec, id, created_by: uid }); if (x.error) throw x.error; return id; },
      update: async (id, rec) => { const x = await sb.from("facilities").update(rec).eq("id", id); if (x.error) throw x.error; },
    }, c, async () => { await load(); draw(); });
  }
  paint();
});
