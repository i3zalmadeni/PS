boot("audit.html", async (m, c) => {
  const [a, st] = await Promise.all([sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300), sb.from("staff_members").select("user_id,full_name").not("user_id", "is", null)]);
  const who = Object.fromEntries((st.data || []).map((x) => [x.user_id, x.full_name])), rows = a.data || [];
  const tables = [...new Set(rows.map((r) => r.table_name).filter(Boolean))];
  m.innerHTML = head("سجل التدقيق", "آخر 300 عملية على البيانات المركزية") + `<div class="bar"><select id="ft"><option value="">كل الجداول</option>${tables.map((t) => `<option>${esc(t)}</option>`).join("")}</select><select id="fa"><option value="">كل العمليات</option><option>INSERT</option><option>UPDATE</option><option>DELETE</option><option>rotate_key</option></select></div>
    <div class="tw"><table><thead><tr><th>الوقت</th><th>المنفِّذ</th><th>العملية</th><th>الجدول</th><th>التفاصيل</th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const draw = () => {
    const t = document.getElementById("ft").value, ac = document.getElementById("fa").value;
    document.getElementById("tb").innerHTML = rows.filter((r) => (!t || r.table_name === t) && (!ac || r.action === ac)).map((r) =>
      `<tr><td>${new Date(r.created_at).toLocaleString("ar-SA-u-nu-latn")}</td><td>${esc(who[r.actor_id] || (r.actor_id ? "مستخدم" : "النظام"))}</td><td>${esc(r.action)}</td><td>${esc(r.table_name || "")}</td>
      <td><details><summary>عرض</summary><pre>${esc(JSON.stringify({ قبل: r.old_data, بعد: r.new_data }, null, 1))}</pre></details></td></tr>`).join("") || '<tr><td colspan="5">لا توجد عمليات.</td></tr>';
  };
  ["ft", "fa"].forEach((i) => document.getElementById(i).addEventListener("input", draw)); draw();
}, { admin: true });
