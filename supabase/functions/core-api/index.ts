import { createClient } from "npm:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(URL_, SVC, { auth: { persistSession: false } });

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-system-key",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
// حسابات المعرّف تُسجَّل داخلياً ببريد غير حقيقي بهذا النطاق (يجب أن يطابق LOGIN_DOMAIN في site/assets/config.js)
const LOGIN_DOMAIN = "id.invalid";
const LOGIN_ID = /^[a-z0-9][a-z0-9._-]{2,39}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// الحقول المتاحة للأنظمة المستقلة: لا بيانات تواصل ولا عناوين
const STAFF_COLS = "id,full_name,category,job_title,specialty,qualification,department,employment_status,is_active,joined_on,account_status,updated_at";
const FAC_COLS = "id,code,name,type_code,building,floor,room_no,area_m2,capacity,status,primary_staff_id,backup_staff_id,updated_at";
const STU_COLS = "id,student_no,full_name,study_status,enrollment_type,nationality,updated_at";
const REG_SCOPE: Record<string, string> = { school: "school:read", personnel: "staff:read", students: "students:read", facilities: "facilities:read" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const u = new URL(req.url);
  const path = (u.pathname.split("/core-api")[1] ?? u.pathname).replace(/\/+$/, "") || "/";
  try {
    if (path.startsWith("/admin/")) return await adminRoute(req, path);
    if (path.startsWith("/v1/")) return await integrationRoute(req, u, path);
    return json({ service: "core-api", version: "2.0", docs: "docs/api.md" });
  } catch (e) {
    console.error(e);
    return json({ error: "internal_error" }, 500);
  }
});

// ===== مسارات التكامل: قراءة فقط، ومفتاح النظام في x-system-key =====
async function integrationRoute(req: Request, u: URL, path: string) {
  const key = req.headers.get("x-system-key");
  if (!key) return json({ error: "missing_system_key" }, 401);
  const { data: sys } = await db.from("systems").select("code,scopes,status").eq("api_key_hash", await sha256(key)).maybeSingle();
  if (!sys || sys.status === "suspended") return json({ error: "invalid_system_key" }, 401);
  db.from("systems").update({ last_seen_at: new Date().toISOString() }).eq("code", sys.code).then(() => {});
  const log = async (status: number, n?: number) => { await db.from("system_access_logs").insert({ system_code: sys.code, method: req.method, path: path + (u.search ? "?…" : ""), status, record_count: n ?? null }); };
  const reply = async (body: unknown, status = 200, n?: number) => { await log(status, n); return json(body, status); };
  if (req.method !== "GET") return reply({ error: "read_only_api" }, 405);
  const scopes = sys.scopes as string[], need = (s: string) => scopes.includes(s);
  const deny = (s: string) => reply({ error: "scope_required", scope: s }, 403);
  const lim = Math.min(Math.max(parseInt(u.searchParams.get("limit") ?? "100") || 100, 1), 500);
  const off = Math.max(parseInt(u.searchParams.get("offset") ?? "0") || 0, 0);
  const since = u.searchParams.get("updated_since");
  const seg = path.split("/").filter(Boolean); // v1, resource, id?

  if (seg[1] === "school" && !seg[2]) {
    if (!need("school:read")) return deny("school:read");
    const [p, y, g, s] = await Promise.all([
      db.from("school_profile").select("official_name,ministry_no,stage,school_type,gender,education_department,education_office,region,city,district,phone,email,website,updated_at").maybeSingle(),
      db.from("academic_years").select("id,name,status,starts_on,ends_on").order("created_at", { ascending: false }),
      db.from("grade_levels").select("code,name_ar,sort_order,is_active").order("sort_order"),
      db.rpc("school_stats"),
    ]);
    return reply({ data: { profile: p.data, academic_years: y.data, grades: g.data, stats: s.data } }, 200, 1);
  }
  if (seg[1] === "staff" && !seg[2]) {
    if (!need("staff:read")) return deny("staff:read");
    let q = db.from("staff_members").select(STAFF_COLS, { count: "exact" }).order("full_name").range(off, off + lim - 1);
    const cat = u.searchParams.get("category"); if (cat) q = q.eq("category", cat);
    if (since) q = q.gte("updated_at", since);
    if (u.searchParams.get("active") !== "all") q = q.eq("is_active", true);
    const { data, count, error } = await q; if (error) return reply({ error: "bad_request" }, 400);
    return reply({ data, total: count, limit: lim, offset: off }, 200, data?.length);
  }
  if (seg[1] === "staff" && seg[2] && UUID.test(seg[2]) && !seg[3]) {
    if (!need("staff:read")) return deny("staff:read");
    const { data } = await db.from("staff_members").select(STAFF_COLS).eq("id", seg[2]).maybeSingle();
    if (!data) return reply({ error: "not_found" }, 404);
    return reply({ data }, 200, 1);
  }
  if (seg[1] === "students" && !seg[2]) {
    if (!need("students:read")) return deny("students:read");
    const yearParam = u.searchParams.get("year");
    let yid = yearParam && UUID.test(yearParam) ? yearParam : null;
    if (!yid) { const { data: cy } = await db.from("academic_years").select("id").eq("status", "current").maybeSingle(); yid = cy?.id ?? null; }
    if (!yid) return reply({ data: [], total: 0, limit: lim, offset: off }, 200, 0);
    let q = db.from("student_enrollments").select(`id,year_id,grade_code,section_id,status,students!inner(${STU_COLS})`, { count: "exact" }).eq("year_id", yid).order("created_at").range(off, off + lim - 1);
    const gr = u.searchParams.get("grade"); if (gr) q = q.eq("grade_code", gr);
    if (since) q = q.gte("updated_at", since);
    const { data, count, error } = await q; if (error) return reply({ error: "bad_request" }, 400);
    return reply({ data, total: count, limit: lim, offset: off }, 200, data?.length);
  }
  if (seg[1] === "facilities" && !seg[2]) {
    if (!need("facilities:read")) return deny("facilities:read");
    let q = db.from("facilities").select(FAC_COLS, { count: "exact" }).order("code").range(off, off + lim - 1);
    const t = u.searchParams.get("type"); if (t) q = q.eq("type_code", t);
    if (since) q = q.gte("updated_at", since);
    const { data, count, error } = await q; if (error) return reply({ error: "bad_request" }, 400);
    return reply({ data, total: count, limit: lim, offset: off }, 200, data?.length);
  }
  if (seg[1] === "facilities" && seg[2] && UUID.test(seg[2]) && !seg[3]) {
    if (!need("facilities:read")) return deny("facilities:read");
    const [f, e] = await Promise.all([db.from("facilities").select(FAC_COLS).eq("id", seg[2]).maybeSingle(), db.from("facility_equipment").select("name,quantity,notes").eq("facility_id", seg[2])]);
    if (!f.data) return reply({ error: "not_found" }, 404);
    return reply({ data: { ...f.data, equipment: e.data } }, 200, 1);
  }
  if (seg[1] === "changes" && !seg[2]) {
    if (!need("changes:read")) return deny("changes:read");
    const allowed = Object.entries(REG_SCOPE).filter(([, s]) => need(s)).map(([r]) => r);
    const reg = u.searchParams.get("registry");
    const regs = reg ? allowed.filter((r) => r === reg) : allowed;
    if (!regs.length) return reply({ data: [], next_cursor: null }, 200, 0);
    const after = parseInt(u.searchParams.get("after") ?? "0") || 0;
    let q = db.from("change_events").select("id,registry,entity_id,op,changed_at").in("registry", regs).gt("id", after).order("id").limit(lim);
    if (since) q = q.gte("changed_at", since);
    const { data, error } = await q; if (error) return reply({ error: "bad_request" }, 400);
    return reply({ data, next_cursor: data?.length ? data[data.length - 1].id : after }, 200, data?.length);
  }
  if (seg[1] === "identity" && seg[2] === "verify") {
    if (!need("identity:verify")) return deny("identity:verify");
    const uid = u.searchParams.get("user_id"), sid = u.searchParams.get("staff_id");
    let q = db.from("staff_members").select("id,user_id,full_name,category,job_title,is_active,account_status");
    if (uid && UUID.test(uid)) q = q.eq("user_id", uid); else if (sid && UUID.test(sid)) q = q.eq("id", sid); else return reply({ error: "user_id_or_staff_id_required" }, 400);
    const { data: s } = await q.maybeSingle();
    if (!s) return reply({ valid: false }, 200, 0);
    const valid = s.is_active && s.account_status === "active";
    const [{ data: roles }, { data: perms }] = await Promise.all([
      db.from("staff_roles").select("role_code,system_code").eq("staff_id", s.id).is("ended_on", null),
      db.from("staff_permissions").select("permission_code,permissions!inner(system_code,level)").eq("staff_id", s.id).eq("permissions.system_code", sys.code),
    ]);
    return reply({ valid, staff: { id: s.id, full_name: s.full_name, category: s.category, job_title: s.job_title },
      roles: (roles ?? []).filter((r) => !r.system_code || r.system_code === sys.code),
      permissions: (perms ?? []).map((p) => ({ code: p.permission_code, level: (p as any).permissions.level })) }, 200, 1);
  }
  return reply({ error: "not_found" }, 404);
}

// ===== مسارات الإدارة: رمز المستخدم، ويُشترط أن يكون مدير نواة =====
async function adminRoute(req: Request, path: string) {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const auth = req.headers.get("authorization") ?? "";
  const caller = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: ok } = await caller.rpc("is_core_admin");
  if (ok !== true) return json({ error: "forbidden" }, 403);
  const body = await req.json().catch(() => ({}));
  const staffId = String(body.staff_id ?? "");
  if (!UUID.test(staffId)) return json({ error: "invalid_staff_id" }, 400);
  const { data: s } = await db.from("staff_members").select("id,user_id").eq("id", staffId).maybeSingle();
  if (!s) return json({ error: "staff_not_found" }, 404);

  if (path === "/admin/create-account") {
    if (s.user_id) return json({ error: "account_exists" }, 409);
    // المعرّف: أرقام أو حروف إنجليزية (غير مرتبط ببريد). وللتوافق: إن احتوى على @ عُدَّ بريداً حقيقياً.
    const ident = String(body.login_id ?? body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const isEmail = ident.includes("@");
    if (isEmail ? !EMAIL.test(ident) : !LOGIN_ID.test(ident)) return json({ error: isEmail ? "invalid_email" : "invalid_login_id" }, 400);
    if (password.length < 10) return json({ error: "password_too_short", min: 10 }, 400);
    const contact = isEmail ? "" : String(body.contact_email ?? "").trim().toLowerCase();
    if (contact && !EMAIL.test(contact)) return json({ error: "invalid_email" }, 400);
    if (!isEmail) {
      const { data: taken } = await db.from("staff_private").select("staff_id").eq("login_id", ident).neq("staff_id", staffId).maybeSingle();
      if (taken) return json({ error: "login_id_taken" }, 409);
    }
    const email = isEmail ? ident : `${ident}@${LOGIN_DOMAIN}`;
    const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !created.user) return json({ error: /already|registered|exists/i.test(error?.message ?? "") ? (isEmail ? "email_taken" : "login_id_taken") : (error?.message ?? "create_failed") }, isEmail ? 400 : 409);
    const { error: e2 } = await db.from("staff_members").update({ user_id: created.user.id, account_status: "active" }).eq("id", staffId);
    if (e2) { await db.auth.admin.deleteUser(created.user.id); return json({ error: e2.message }, 400); }
    const { error: e3 } = await db.from("staff_private").upsert(isEmail ? { staff_id: staffId, email: ident } : { staff_id: staffId, login_id: ident, ...(contact ? { email: contact } : {}) }, { onConflict: "staff_id" });
    if (e3) {
      await db.from("staff_members").update({ user_id: null, account_status: "none" }).eq("id", staffId);
      await db.auth.admin.deleteUser(created.user.id);
      return json({ error: /login_id_uq/.test(e3.message) ? "login_id_taken" : /email_uq/.test(e3.message) ? "email_taken" : e3.message }, 409);
    }
    return json({ ok: true, user_id: created.user.id, login_id: isEmail ? null : ident });
  }
  if (path === "/admin/set-login-id") {
    if (!s.user_id) return json({ error: "no_account" }, 409);
    const id = String(body.login_id ?? "").trim().toLowerCase();
    if (!LOGIN_ID.test(id)) return json({ error: "invalid_login_id" }, 400);
    const { data: taken } = await db.from("staff_private").select("staff_id").eq("login_id", id).neq("staff_id", staffId).maybeSingle();
    if (taken) return json({ error: "login_id_taken" }, 409);
    const { data: cur } = await db.auth.admin.getUserById(s.user_id);
    const oldEmail = cur?.user?.email;
    const { error } = await db.auth.admin.updateUserById(s.user_id, { email: `${id}@${LOGIN_DOMAIN}`, email_confirm: true });
    if (error) return json({ error: /already|registered|exists/i.test(error.message) ? "login_id_taken" : error.message }, 409);
    const { error: e3 } = await db.from("staff_private").upsert({ staff_id: staffId, login_id: id }, { onConflict: "staff_id" });
    if (e3) {
      if (oldEmail) await db.auth.admin.updateUserById(s.user_id, { email: oldEmail, email_confirm: true });
      return json({ error: /login_id_uq/.test(e3.message) ? "login_id_taken" : e3.message }, 409);
    }
    return json({ ok: true, login_id: id });
  }
  if (path === "/admin/set-email") {
    if (!s.user_id) return json({ error: "no_account" }, 409);
    const email = String(body.email ?? "").trim().toLowerCase();
    const { data: cur } = await db.auth.admin.getUserById(s.user_id);
    const oldEmail = cur?.user?.email ?? "";
    // حساب يدخل بالبريد: تغيير البريد يغيّر بريد الدخول أيضاً. حساب يدخل بمعرّف: البريد للتواصل فقط.
    const byEmail = !oldEmail.endsWith("@" + LOGIN_DOMAIN);
    if (!email) {
      if (byEmail) return json({ error: "email_required" }, 400);
      const { error } = await db.from("staff_private").upsert({ staff_id: staffId, email: null }, { onConflict: "staff_id" });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, email: null, login_changed: false });
    }
    if (!EMAIL.test(email) || email.endsWith("@" + LOGIN_DOMAIN)) return json({ error: "invalid_email" }, 400);
    const { data: taken } = await db.from("staff_private").select("staff_id").eq("email", email).neq("staff_id", staffId).maybeSingle();
    if (taken) return json({ error: "email_taken" }, 409);
    if (byEmail) {
      const { error } = await db.auth.admin.updateUserById(s.user_id, { email, email_confirm: true });
      if (error) return json({ error: /already|registered|exists/i.test(error.message) ? "email_taken" : error.message }, 409);
    }
    const { error: e3 } = await db.from("staff_private").upsert({ staff_id: staffId, email }, { onConflict: "staff_id" });
    if (e3) {
      if (byEmail && oldEmail) await db.auth.admin.updateUserById(s.user_id, { email: oldEmail, email_confirm: true });
      return json({ error: /email_uq/.test(e3.message) ? "email_taken" : e3.message }, 409);
    }
    return json({ ok: true, email, login_changed: byEmail });
  }
  if (path === "/admin/set-status") {
    if (!s.user_id) return json({ error: "no_account" }, 409);
    const st = String(body.status ?? "");
    if (!["active", "suspended"].includes(st)) return json({ error: "invalid_status" }, 400);
    const { error } = await db.auth.admin.updateUserById(s.user_id, { ban_duration: st === "suspended" ? "876000h" : "none" });
    if (error) return json({ error: error.message }, 400);
    await db.from("staff_members").update({ account_status: st }).eq("id", staffId);
    return json({ ok: true });
  }
  if (path === "/admin/reset-password") {
    if (!s.user_id) return json({ error: "no_account" }, 409);
    const password = String(body.password ?? "");
    if (password.length < 10) return json({ error: "password_too_short", min: 10 }, 400);
    const { error } = await db.auth.admin.updateUserById(s.user_id, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }
  return json({ error: "not_found" }, 404);
}
