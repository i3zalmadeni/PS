/* عناصر الهوية المشتركة: الشعار، شارة الوزارة، التذييل، حركة الشريط مع التمرير */
const LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#18a4ab"/><stop offset="1" stop-color="#0c6f82"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#lg)"/><circle cx="32" cy="32" r="7" fill="#fff"/><g fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><circle cx="32" cy="32" r="16" stroke-dasharray="3 7"/></g><circle cx="32" cy="12" r="4" fill="#f0b34a"/></svg>';
const brandHTML = (href) => `<a class="bm" href="${href || "index.html"}">${LOGO}<span><b>النواة الرقمية</b><small>متوسطة لبيد بن ربيعة</small></span></a>`;
const moeHTML = '<span class="moe"><b>وزارة التعليم</b><small>المملكة العربية السعودية</small></span>';
const footerHTML = `<footer class="lab-foot"><div class="wrap lf"><div class="lf-id">${moeHTML}<span class="mid"><b>متوسطة لبيد بن ربيعة</b><span>النواة الرقمية للمدرسة</span></span></div>
<div class="lf-card"><div class="lf-brand"><svg class="lf-logo" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="#fff"/><g class="lf-ring"><circle cx="60" cy="60" r="44" fill="none" stroke="#4fa39a" stroke-width="8" stroke-linecap="round" stroke-dasharray="0.1 13.72"/></g><text x="60" y="76" text-anchor="middle" font-family="Tajawal,sans-serif" font-size="50" font-weight="800" fill="#1b2a3a">ع</text><g class="lf-orb"><circle cx="60" cy="16" r="6.5" fill="#e0955a"/></g></svg><span><b>أحد منتجات مختبر الأفكار</b><small>منظومة المدرسة الرقمية</small></span></div></div></div></footer>`;
(function () {
  const r = document.documentElement; let t = 0;
  const upd = () => { t = 0; const h = document.documentElement.scrollHeight - innerHeight; r.style.setProperty("--sp", h > 0 ? Math.min(1, scrollY / h).toFixed(3) : 0); };
  addEventListener("scroll", () => { if (!t) t = requestAnimationFrame(upd); }, { passive: true }); addEventListener("resize", upd); upd();
})();
function bindNav() { const b = document.querySelector(".navtoggle"), n = document.querySelector("header nav"); if (b && n) b.onclick = () => { const o = n.classList.toggle("open"); b.setAttribute("aria-expanded", o); }; }

// ===== الموقع العام: ترويسة (النواة يميناً، الصفحات وسطاً، شعار الوزارة يساراً) وديناميكية الصفحات =====
const PUB_NAV = [["index.html", "الرئيسية"], ["about.html", "عن النواة"], ["login.html", "تسجيل الدخول"]];
const pubHeader = (active) => `<header><div class="wrap top">${brandHTML("index.html")}<button class="navtoggle" aria-label="القائمة" aria-expanded="false">☰</button>
<nav>${PUB_NAV.map(([h, n]) => `<a href="${h}" class="${h === active ? "on" : ""}" ${h === "login.html" ? 'data-login="1"' : ""}>${n}</a>`).join("")}</nav>${moeHTML}</div></header>`;
const CORE_ICON = `<svg class="core-ic" viewBox="0 0 160 160" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#18a4ab"/><stop offset="1" stop-color="#0c6f82"/></linearGradient></defs>
<rect x="14" y="14" width="132" height="132" rx="34" fill="url(#cg)"/><g class="ci-ring"><circle cx="80" cy="80" r="40" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-dasharray="7 17"/></g>
<circle cx="80" cy="80" r="17" fill="#fff"/><g class="ci-orb"><circle cx="80" cy="30" r="10" fill="#f0b34a"/></g></svg>`;
function pubInit(active) {
  const h = document.getElementById("hdr"); if (h) h.outerHTML = pubHeader(active);
  const f = document.getElementById("ftr"); if (f) f.outerHTML = footerHTML;
  document.querySelectorAll("[data-core]").forEach((e) => (e.innerHTML = CORE_ICON));
  bindNav();
  try { if (Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k))) document.querySelectorAll("[data-login]").forEach((a) => { a.textContent = "لوحة التحكم"; a.href = "dashboard.html"; }); } catch (e) {}
  const rv = document.querySelectorAll(".rv"), reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const count = (el) => { const to = +el.dataset.count, t0 = performance.now(); if (reduce) { el.textContent = to; return; } const step = (t) => { const k = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
  if (!("IntersectionObserver" in window)) { rv.forEach((e) => e.classList.add("in")); document.querySelectorAll("[data-count]").forEach(count); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); e.target.querySelectorAll("[data-count]").forEach(count); if (e.target.dataset.count) count(e.target); io.unobserve(e.target); } }), { threshold: 0.15 });
  rv.forEach((e) => io.observe(e));
  const hero = document.querySelector(".hero"); if (hero && !reduce) hero.addEventListener("pointermove", (ev) => { const r = hero.getBoundingClientRect(); hero.style.setProperty("--mx", ((ev.clientX - r.left) / r.width).toFixed(3)); hero.style.setProperty("--my", ((ev.clientY - r.top) / r.height).toFixed(3)); });
}
