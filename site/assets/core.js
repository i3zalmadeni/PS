const sb = supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NAV = [["dashboard.html", "لوحة النواة"], ["staff.html", "المنسوبون"], ["teams.html", "الفرق واللجان"]];
async function boot(page, render) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace("index.html"); return; }
  const { data: me } = await sb.from("staff_members").select("id,full_name").eq("user_id", session.user.id).maybeSingle();
  if (!me) { await sb.auth.signOut(); location.replace("index.html?e=nostaff"); return; }
  document.getElementById("shell").innerHTML =
    `<header><div class="wrap top"><div class="brand"><b>النواة الرقمية</b><small>متوسطة لبيد بن ربيعة</small></div>
     <nav>${NAV.map(([h, n]) => `<a href="${h}" class="${h === page ? "on" : ""}">${n}</a>`).join("")}<a href="#" id="out">خروج (${esc(me.full_name)})</a></nav></div></header>
     <main class="wrap" id="main"></main>`;
  document.getElementById("out").onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.replace("index.html"); };
  try { await render(document.getElementById("main"), me); } catch (e) { console.error(e); document.getElementById("main").innerHTML = '<p class="err">تعذر تحميل الصفحة.</p>'; }
}
const head = (t, s) => `<h2>${esc(t)}</h2>${s ? `<p class="sub">${esc(s)}</p>` : ""}`;
