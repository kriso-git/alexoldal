import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import jwt from "npm:jsonwebtoken"
import bcrypt from "npm:bcryptjs"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JWT_ACCESS_SECRET = Deno.env.get('JWT_ACCESS_SECRET') ?? '8d113bc9c8f967506aba15a0db7d592650d5bea561a37f64e4d050cca1a98c2d1e7c3472a3f6802df1a77de2875de7dd'
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://alexoldal.vercel.app'

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
}
const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}
const res = (d:unknown,s=200) => new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json',...CORS,...SEC}})
const getDb = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {auth:{persistSession:false}})

async function safeJson(req: Request): Promise<Record<string,unknown>> {
  const cl = parseInt(req.headers.get('content-length') ?? '0')
  if (cl > 51200) throw new Error('too_large')
  const text = await req.text()
  if (text.length > 51200) throw new Error('too_large')
  return JSON.parse(text)
}

function getUser(req: Request) {
  try {
    const h = req.headers.get("Authorization") ?? ""
    if (!h.startsWith("Bearer ")) return null
    const p = jwt.verify(h.slice(7), JWT_ACCESS_SECRET) as { sub?: number | string; id?: number; username: string; role: string }
    const rawId = p.sub ?? p.id
    const id = Number(rawId)
    if (!rawId || isNaN(id)) return null
    return { id, username: p.username, role: p.role }
  } catch { return null }
}

Deno.serve(async (req: Request) => {
  if (req.method==='OPTIONS') return new Response(null,{status:204,headers:{...CORS,...SEC}})
  const user=getUser(req)
  if (!user||user.role!=='superadmin') return res({error:'Nincs jogosultság'},403)
  const db=getDb()
  const url=new URL(req.url)
  const segs=url.pathname.split('/')
  const s2=segs[2]??'', s3=segs[3]??'', s4=segs[4]??''

  if (s2==='users'&&!s3&&req.method==='GET') {
    const {data}=await db.from('users').select('id,username,role,is_banned,can_post,failed_logins,locked_until,created_at,last_login').order('created_at',{ascending:false})
    return res(data)
  }

  if (s2==='users'&&s3) {
    const tid=parseInt(s3)
    if (isNaN(tid)||tid<1) return res({error:'Érvénytelen azonosító'},400)

    if (s4==='role'&&req.method==='PATCH') {
      let body: Record<string,unknown>
      try { body=await safeJson(req) } catch { return res({error:'Hibás kérés'},400) }
      const {role}=body
      if (!['user','admin','superadmin'].includes(role as string)) return res({error:'Érvénytelen szerep'},400)
      if (tid===user.id) return res({error:'Saját szerepet nem módosíthatod'},400)
      const {data:t}=await db.from('users').select('id').eq('id',tid).maybeSingle()
      if (!t) return res({error:'Felhasználó nem található'},404)
      await db.from('users').update({role}).eq('id',tid)
      await db.from('audit_log').insert({actor_id:user.id,actor_username:user.username,action:'set_role',target_type:'user',target_id:s3,details:JSON.stringify({role}),created_at:Date.now()})
      return res({ok:true,role})
    }

    if (s4==='ban'&&req.method==='PATCH') {
      let body: Record<string,unknown>
      try { body=await safeJson(req) } catch { return res({error:'Hibás kérés'},400) }
      const {banned,minutes}=body
      if (tid===user.id) return res({error:'Saját magát nem tilthatod'},400)
      const {data:t}=await db.from('users').select('role').eq('id',tid).maybeSingle()
      if (!t) return res({error:'Felhasználó nem található'},404)
      if (t.role==='superadmin') return res({error:'Superadmin nem tiltható'},400)
      const mins=typeof minutes==='number'?Math.max(0,Math.min(minutes,525600)):null
      const banUntil=banned&&mins?Date.now()+mins*60*1000:null
      await db.from('users').update({is_banned:banned,ban_until:banUntil}).eq('id',tid)
      if (banned) await db.from('refresh_tokens').update({revoked:true}).eq('user_id',tid)
      await db.from('audit_log').insert({actor_id:user.id,actor_username:user.username,action:banned?'ban_user':'unban_user',target_type:'user',target_id:s3,details:JSON.stringify({minutes:mins}),created_at:Date.now()})
      return res({ok:true,is_banned:banned,ban_until:banUntil})
    }

    if (s4==='permissions'&&req.method==='PATCH') {
      let body: Record<string,unknown>
      try { body=await safeJson(req) } catch { return res({error:'Hibás kérés'},400) }
      const {can_post}=body
      const {data:t}=await db.from('users').select('role').eq('id',tid).maybeSingle()
      if (!t) return res({error:'Felhasználó nem található'},404)
      if (t.role==='superadmin') return res({error:'Superadmin engedélyek nem módosíthatók'},400)
      await db.from('users').update({can_post:!!can_post}).eq('id',tid)
      await db.from('audit_log').insert({actor_id:user.id,actor_username:user.username,action:'set_permissions',target_type:'user',target_id:s3,details:JSON.stringify({can_post}),created_at:Date.now()})
      return res({ok:true,can_post})
    }

    if (s4==='reset-password'&&req.method==='POST') {
      let body: Record<string,unknown>
      try { body=await safeJson(req) } catch { return res({error:'Hibás kérés'},400) }
      const newPassword=typeof body.newPassword==='string'?body.newPassword:''
      if (!newPassword||newPassword.length<8||newPassword.length>128) return res({error:'A jelszónak 8-128 karakter kell'},400)
      const {data:t}=await db.from('users').select('role').eq('id',tid).maybeSingle()
      if (!t) return res({error:'Felhasználó nem található'},404)
      if (t.role==='superadmin'&&tid!==user.id) return res({error:'Nincs jogosultság'},403)
      const hash=await bcrypt.hash(newPassword,12)
      await db.from('users').update({password_hash:hash,failed_logins:0,locked_until:null}).eq('id',tid)
      await db.from('refresh_tokens').update({revoked:true}).eq('user_id',tid)
      await db.from('audit_log').insert({actor_id:user.id,actor_username:user.username,action:'reset_password',target_type:'user',target_id:s3,created_at:Date.now()})
      return res({ok:true})
    }

    if (!s4&&req.method==='DELETE') {
      if (tid===user.id) return res({error:'Saját fiókot nem törölhetsz'},400)
      const {data:t}=await db.from('users').select('role').eq('id',tid).maybeSingle()
      if (!t) return res({error:'Felhasználó nem található'},404)
      if (t.role==='superadmin') return res({error:'Superadmin nem törölhető'},400)
      await db.from('users').delete().eq('id',tid)
      await db.from('audit_log').insert({actor_id:user.id,actor_username:user.username,action:'delete_user',target_type:'user',target_id:s3,created_at:Date.now()})
      return new Response(null,{status:204,headers:{...CORS,...SEC}})
    }
  }

  if (s2==='audit'&&req.method==='GET') {
    const page=Math.max(0,parseInt(url.searchParams.get('page')??'0')||0)
    const limit=Math.min(100,Math.max(1,parseInt(url.searchParams.get('limit')??'50')||50))
    const action=url.searchParams.get('action')??''
    const uname=url.searchParams.get('username')??''
    let q=db.from('audit_log').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(page*limit,(page+1)*limit-1)
    if (action) q=q.eq('action',action.slice(0,50))
    if (uname) q=q.ilike('actor_username',`%${uname.slice(0,50)}%`)
    const {data,count}=await q
    return res({rows:data,total:count,page,limit})
  }

  if (s2==='stats'&&req.method==='GET') {
    const [a,b,c,d,e,f]=await Promise.all([
      db.from('users').select('*',{count:'exact',head:true}),
      db.from('users').select('*',{count:'exact',head:true}).in('role',['admin','superadmin']),
      db.from('users').select('*',{count:'exact',head:true}).eq('is_banned',true),
      db.from('posts').select('*',{count:'exact',head:true}),
      db.from('comments').select('*',{count:'exact',head:true}),
      db.from('post_reactions').select('*',{count:'exact',head:true}),
    ])
    return res({users:a.count,admins:b.count,banned:c.count,posts:d.count,comments:e.count,reactions:f.count})
  }

  return res({error:'Not found'},404)
})
