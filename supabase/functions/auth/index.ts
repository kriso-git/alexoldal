import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import bcrypt from "npm:bcryptjs"
import jwt from "npm:jsonwebtoken"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JWT_ACCESS_SECRET = Deno.env.get('JWT_ACCESS_SECRET') ?? '8d113bc9c8f967506aba15a0db7d592650d5bea561a37f64e4d050cca1a98c2d1e7c3472a3f6802df1a77de2875de7dd'
const JWT_REFRESH_SECRET = Deno.env.get('JWT_REFRESH_SECRET') ?? 'c54606fe373640d5409b375208caf7038c897d746c964c3b539c3b8040ffcc2263ab7b888167489a3e0632e357b92d78'
const JWT_ACCESS_EXPIRES = Deno.env.get('JWT_ACCESS_EXPIRES') ?? '15m'
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://alexoldal.vercel.app'
const SUPERADMIN_USERNAME = Deno.env.get('SUPERADMIN_USERNAME') ?? 'f3xykee'
const SUPERADMIN_PASSWORD = Deno.env.get('SUPERADMIN_PASSWORD') ?? 'superadmin1337!'

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
}
const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

function res(data: unknown, status = 200, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS, ...SEC, ...extra } })
}

async function safeJson(req: Request): Promise<Record<string,unknown>> {
  const cl = parseInt(req.headers.get('content-length') ?? '0')
  if (cl > 51200) throw new Error('too_large')
  const text = await req.text()
  if (text.length > 51200) throw new Error('too_large')
  return JSON.parse(text)
}

function getDb() { return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }) }

function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 45) || 'unknown'
}

function randomHex(n: number) {
  const a = new Uint8Array(n); crypto.getRandomValues(a)
  return Array.from(a).map(b => b.toString(16).padStart(2,'0')).join('')
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

function makeAccessToken(u: {id:number;username:string;role:string}) {
  return jwt.sign({ sub: u.id, username: u.username, role: u.role }, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_EXPIRES })
}

async function mkRefreshToken(db: ReturnType<typeof getDb>, userId: number) {
  const raw = randomHex(40)
  const hash = await sha256(raw)
  await db.from('refresh_tokens').insert({ user_id: userId, token_hash: hash, expires_at: Date.now() + 7*24*60*60*1000, created_at: Date.now() })
  const secure = ALLOWED_ORIGIN.startsWith('https') ? '; Secure' : ''
  return `rf_token=${raw}; HttpOnly; Path=/api/auth; SameSite=Lax; Max-Age=${7*24*60*60}${secure}`
}

async function seedSuperadmin(db: ReturnType<typeof getDb>) {
  if (!SUPERADMIN_USERNAME || !SUPERADMIN_PASSWORD) return
  const { data } = await db.from('users').select('id').eq('username', SUPERADMIN_USERNAME).maybeSingle()
  if (data) return
  const hash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12)
  await db.from('users').insert({ username: SUPERADMIN_USERNAME, password_hash: hash, role: 'superadmin', can_post: true, created_at: Date.now() })
}

async function isIpRateLimited(db: ReturnType<typeof getDb>, ip: string): Promise<boolean> {
  if (ip === 'unknown') return false
  const window = Date.now() - 15 * 60 * 1000
  const { count } = await db.from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'login_fail')
    .eq('ip', ip)
    .gt('created_at', window)
  return (count ?? 0) >= 20
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...CORS, ...SEC } })
  const segs = new URL(req.url).pathname.split('/')
  const sub = segs[2] ?? ''
  const db = getDb()
  await seedSuperadmin(db)

  if (sub === 'register' && req.method === 'POST') {
    let body: Record<string,unknown>
    try { body = await safeJson(req) } catch { return res({ error: 'Hibás kérés' }, 400) }
    const username = typeof body.username === 'string' ? body.username : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!username || username.length < 3 || username.length > 30 || !/^\w+$/.test(username))
      return res({ error: 'Érvénytelen felhasználónév (3-30 karakter, csak betű/szám/_)' }, 400)
    if (!password || password.length < 8 || password.length > 128)
      return res({ error: 'A jelszónak 8-128 karakter kell' }, 400)
    const { data: ex } = await db.from('users').select('id').eq('username', username).maybeSingle()
    if (ex) return res({ error: 'Ez a felhasználónév már foglalt' }, 409)
    const hash = await bcrypt.hash(password, 12)
    const { data: user, error } = await db.from('users')
      .insert({ username, password_hash: hash, role: 'user', can_post: false, created_at: Date.now() })
      .select('id,username,role,can_post,avatar_url,xp')
      .single()
    if (error) return res({ error: 'Regisztráció sikertelen' }, 500)
    const accessToken = makeAccessToken(user)
    const cookie = await mkRefreshToken(db, user.id)
    await db.from('audit_log').insert({ actor_id: user.id, actor_username: user.username, action: 'register', created_at: Date.now() })
    return res({ user: { ...user, avatar_url: user.avatar_url ?? null, xp: user.xp ?? 0 }, accessToken }, 201, { 'Set-Cookie': cookie })
  }

  if (sub === 'login' && req.method === 'POST') {
    const ip = clientIp(req)
    if (await isIpRateLimited(db, ip)) return res({ error: 'Túl sok próbálkozás. Próbáld újra 15 perc múlva.' }, 429)
    let body: Record<string,unknown>
    try { body = await safeJson(req) } catch { return res({ error: 'Hibás kérés' }, 400) }
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!username || !password) return res({ error: 'Hiányzó adatok' }, 400)
    if (username.length > 100 || password.length > 256) return res({ error: 'Érvénytelen adatok' }, 400)
    const { data: u } = await db.from('users').select('*').eq('username', username).maybeSingle()
    const now = Date.now()
    if (!u) {
      await db.from('audit_log').insert({ actor_username: username.slice(0, 50), action: 'login_fail', ip, created_at: now })
      return res({ error: 'Hibás felhasználónév vagy jelszó' }, 401)
    }
    if (u.is_banned) {
      if (u.ban_until && now > u.ban_until) { await db.from('users').update({ is_banned: false, ban_until: null }).eq('id', u.id) }
      else return res({ error: 'A fiók tiltva van' }, 403)
    }
    if (u.locked_until && now < u.locked_until) return res({ error: 'Fiók zárolva. Próbáld újra később.' }, 429)
    if (!await bcrypt.compare(password, u.password_hash)) {
      const fails = (u.failed_logins ?? 0) + 1
      const upd: Record<string,unknown> = { failed_logins: fails }
      if (fails >= 5) upd.locked_until = now + 5*60*1000
      await db.from('users').update(upd).eq('id', u.id)
      await db.from('audit_log').insert({ actor_id: u.id, actor_username: u.username, action: 'login_fail', ip, details: JSON.stringify({ attempt: fails }), created_at: now })
      return res({ error: 'Hibás felhasználónév vagy jelszó' }, 401)
    }
    await db.from('users').update({ failed_logins: 0, locked_until: null, last_login: now }).eq('id', u.id)
    const accessToken = makeAccessToken(u)
    const cookie = await mkRefreshToken(db, u.id)
    await db.from('audit_log').insert({ actor_id: u.id, actor_username: u.username, action: 'login', ip, created_at: now })
    // ▼ VÁLTOZÁS: avatar_url és xp hozzáadva
    return res({ user: { id: u.id, username: u.username, role: u.role, can_post: u.can_post, avatar_url: u.avatar_url ?? null, xp: u.xp ?? 0 }, accessToken }, 200, { 'Set-Cookie': cookie })
  }

  if (sub === 'logout' && req.method === 'POST') {
    const m = (req.headers.get('cookie') ?? '').match(/rf_token=([^;]+)/)
    if (m) { const h = await sha256(m[1]); await db.from('refresh_tokens').update({ revoked: true }).eq('token_hash', h) }
    return res({ ok: true }, 200, { 'Set-Cookie': 'rf_token=; HttpOnly; Path=/api/auth; SameSite=Lax; Max-Age=0' })
  }

  if (sub === 'refresh' && req.method === 'POST') {
    if (!req.headers.get('x-requested-with')) return res({ error: 'Forbidden' }, 403)
    const m = (req.headers.get('cookie') ?? '').match(/rf_token=([^;]+)/)
    if (!m) return res({ error: 'Nincs refresh token' }, 401)
    const h = await sha256(m[1])
    // ▼ VÁLTOZÁS: avatar_url és xp a join selectben
    const { data: rt } = await db.from('refresh_tokens')
      .select('*, users!refresh_tokens_user_id_fkey(id,username,role,is_banned,can_post,avatar_url,xp)')
      .eq('token_hash', h).eq('revoked', false).maybeSingle()
    if (!rt || rt.expires_at < Date.now()) {
      if (rt) await db.from('refresh_tokens').update({ revoked: true }).eq('id', rt.id)
      return res({ error: 'Érvénytelen refresh token' }, 401)
    }
    // ▼ VÁLTOZÁS: bővített típus
    const u = rt.users as {id:number;username:string;role:string;is_banned:boolean;can_post:boolean;avatar_url:string|null;xp:number}
    if (u.is_banned) return res({ error: 'Fiók tiltva' }, 403)
    await db.from('refresh_tokens').update({ revoked: true }).eq('id', rt.id)
    await db.from('refresh_tokens').delete().eq('user_id', u.id).lt('expires_at', Date.now())
    const accessToken = makeAccessToken(u)
    const cookie = await mkRefreshToken(db, u.id)
    // ▼ VÁLTOZÁS: avatar_url és xp a válaszban
    return res({ accessToken, user: { id: u.id, username: u.username, role: u.role, can_post: u.can_post, avatar_url: u.avatar_url ?? null, xp: u.xp ?? 0 } }, 200, { 'Set-Cookie': cookie })
  }

  if (sub === 'me' && req.method === 'GET') {
    const auth = req.headers.get('authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return res({ error: 'Nem vagy bejelentkezve' }, 401)
    try {
      const p = jwt.verify(auth.slice(7), JWT_ACCESS_SECRET) as {sub:number}
      // ▼ VÁLTOZÁS: avatar_url és xp a selectben
      const { data: u } = await db.from('users')
        .select('id,username,role,is_banned,can_post,avatar_url,xp')
        .eq('id', p.sub).maybeSingle()
      if (!u || u.is_banned) return res({ error: 'Unauthorized' }, 401)
      return res({ user: { ...u, avatar_url: u.avatar_url ?? null, xp: u.xp ?? 0 } })
    } catch { return res({ error: 'Érvénytelen token' }, 401) }
  }

  return res({ error: 'Not found' }, 404)
})