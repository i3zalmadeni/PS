const SCOPES = { "staff:read": "قراءة المنسوبين", "staff:contact": "بيانات التواصل والرقم الوظيفي", "teams:read": "قراءة الفرق والعضويات", "identity:verify": "التحقق من الهوية والصلاحيات" };
boot("integrations.html", async (m, c) => {
  let rows = [];
  async function load() { rows = (await sb.from("systems").select("code,name_ar,description,status,scopes,last_seen_at").order("name_ar")).data || []; }
  await load();
  const base = FN + "/v1";
  function paint() {
    m.innerHTML = head("مركز الربط والتكامل", "لكل نظام سجل ومفتاح ونطاقات وصول مستقلة؛ الأنظمة تقرأ من النواة ولا تنسخ بيانات المنسوبين") +
      `<div class="acts"><button class="btn" id="ns">تسجيل نظام جديد</button></div><div class="tw mt"><table><thead><tr><th>النظام</th><th>الحالة</th><th>النطاقات</th><th>آخر اتصال</th><th></th></tr></thead><tbody>${rows.map((s) =>
      `<tr><td>${esc(s.name_ar)}<br><small dir="ltr">${esc(s.code)}</small></td><td><span class="badge ${s.status === "connected" ? "ok" : s.status === "suspended" ? "bad" : ""}">${({ planned: "مخطط", connected: "متصل", suspended: "موقوف" })[s.status]}</span></td>
       <td>${s.scopes.map((x) => `<span class="badge">${esc(x)}</span>`).join(" ")}</td><td>${s.last_seen_at ? fmt(s.last_seen_at) : "—"}</td>
       <td class="acts"><button class="btn sm" data-k="${s.code}">مفتاح جديد</button><button class="btn sm sec" data-sc="${s.code}">النطاقات</button><button class="btn sm ${s.status === "suspended" ? "" : "bad"}" data-st="${s.code}">${s.status === "suspended" ? "إعادة التفعيل" : "إيقاف"}</button></td></tr>`).join("")}</tbody></table></div>
      <h3 class="sec">توثيق الواجهة</h3><div class="card"><p>عنوان الأساس:</p><pre>${esc(base)}</pre><p>أرسل مفتاح النظام في الترويسة <code dir="ltr">x-system-key</code>. جميع الطلبات GET.</p>
      <pre>curl -H "x-system-key: sk_..." "${esc(base)}/staff?category=teaching&amp;limit=50"
curl -H "x-system-key: sk_..." "${esc(base)}/staff/{staff_id}"
curl -H "x-system-key: sk_..." "${esc(base)}/staff/{staff_id}/memberships"
curl -H "x-system-key: sk_..." "${esc(base)}/teams?type=plc"
curl -H "x-system-key: sk_..." "${esc(base)}/teams/{team_id}/members"
curl -H "x-system-key: sk_..." "${esc(base)}/identity/verify?user_id={auth_user_id}"</pre><p>التوثيق الكامل في docs/api.md داخل المستودع.</p></div>`;
    m.querySelector("#ns").onclick = newSys;
    m.querySelectorAll("[data-k]").forEach((b) => (b.onclick = async () => {
      if (!confirm("سيُبطل المفتاح الحالي إن وُجد. متابعة؟")) return;
      const r = await sb.rpc("rotate_system_key", { p_code: b.dataset.k }); if (r.error) { toast(mapErr(r.error), true); return; }
      const md = modal(`<h3>مفتاح النظام</h3><p>انسخه الآن؛ لن يظهر مرة أخرى.</p><pre id="kv">${esc(r.data)}</pre><div class="acts"><button class="btn" id="cp">نسخ</button><button class="btn sec" id="cx">إغلاق</button></div>`);
      md.el.querySelector("#cp").onclick = () => navigator.clipboard.writeText(r.data).then(() => toast("نُسخ")); md.el.querySelector("#cx").onclick = async () => { md.close(); await load(); paint(); };
    }));
    m.querySelectorAll("[data-sc]").forEach((b) => (b.onclick = () => {
      const s = rows.find((x) => x.code === b.dataset.sc);
      const md = modal(`<h3>نطاقات ${esc(s.name_ar)}</h3>${Object.entries(SCOPES).map(([k, n]) => `<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" style="width:auto" value="${k}" ${s.scopes.includes(k) ? "checked" : ""}> ${esc(n)} <small dir="ltr">(${k})</small></label>`).join("")}<div class="acts mt"><button class="btn" id="ok">حفظ</button><button class="btn sec" id="cx">إلغاء</button></div>`);
      md.el.querySelector("#cx").onclick = md.close;
      md.el.querySelector("#ok").onclick = async () => { const sc = [...md.el.querySelectorAll("input:checked")].map((x) => x.value); const r = await sb.from("systems").update({ scopes: sc }).eq("code", s.code); if (r.error) { toast(mapErr(r.error), true); return; } md.close(); await load(); paint(); };
    }));
    m.querySelectorAll("[data-st]").forEach((b) => (b.onclick = async () => { const s = rows.find((x) => x.code === b.dataset.st); const r = await sb.from("systems").update({ status: s.status === "suspended" ? "connected" : "suspended" }).eq("code", s.code); if (r.error) toast(mapErr(r.error), true); await load(); paint(); }));
  }
  function newSys() {
    const md = modal(`<h3>تسجيل نظام</h3><form id="nf"><label>المعرّف (لاتيني صغير)</label><input name="code" required pattern="[a-z][a-z0-9_]{2,40}" dir="ltr"><label>الاسم</label><input name="name_ar" required><label>الوصف</label><input name="description">
      <p class="err" id="fe"></p><div class="acts mt"><button class="btn">تسجيل</button><button type="button" class="btn sec" id="cx">إلغاء</button></div></form>`);
    md.el.querySelector("#cx").onclick = md.close;
    md.el.querySelector("#nf").onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
      const r = await sb.from("systems").insert({ code: v.code, name_ar: v.name_ar.trim(), description: nn(v.description.trim()) }); if (r.error) { md.el.querySelector("#fe").textContent = mapErr(r.error); return; }
      const levels = ["view", "add", "edit", "approve"], ar = { view: "اطلاع", add: "إضافة", edit: "تعديل", approve: "اعتماد" };
      await sb.from("permissions").insert(levels.map((l) => ({ code: `${v.code}:${l}`, system_code: v.code, level: l, name_ar: `${v.name_ar.trim()} – ${ar[l]}` })));
      md.close(); await load(); paint(); };
  }
  paint();
}, { admin: true });
