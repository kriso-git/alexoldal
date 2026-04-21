import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jwt from "npm:jsonwebtoken"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const JWT_SECRET   = Deno.env.get("JWT_ACCESS_SECRET") ?? "8d113bc9c8f967506aba15a0db7d592650d5bea561a37f64e4d050cca1a98c2d1e7c3472a3f6802df1a77de2875de7dd"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
}
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

function getUser(req: Request) {
  try {
    const h = req.headers.get("Authorization") ?? ""
    if (!h.startsWith("Bearer ")) return null
    const p = jwt.verify(h.slice(7), JWT_SECRET) as { sub?: number | string; id?: number; username: string; role: string }
    const rawId = p.sub ?? p.id
    const id = Number(rawId)
    if (!rawId || isNaN(id)) return null
    return { id, username: p.username, role: p.role }
  } catch { return null }
}

function getLevel(xp: number) {
  let l = 1; while (xp >= l * (l + 1) / 2 * 100) l++; return l
}

async function awardXp(db: ReturnType<typeof createClient>, userId: number, amount: number): Promise<number> {
  const { data: u } = await db.from("users").select("xp").eq("id", userId).single()
  const newXp = (u?.xp ?? 0) + amount
  await db.from("users").update({ xp: newXp }).eq("id", userId)
  return newXp
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  const db   = createClient(SUPABASE_URL, SERVICE_KEY)
  const user = getUser(req)
  const parts = new URL(req.url).pathname.split("/").filter(Boolean)
  // /profile-wall/:username  or  /profile-wall/:username/:id
  const profileUsername = decodeURIComponent(parts[1] ?? "")
  const msgId           = parts[2] ? decodeURIComponent(parts[2]) : null

  if (!profileUsername) return json({ error: "Hiányzó felhasználónév" }, 400)

  // GET — üzenetek listája
  if (req.method === "GET") {
    const { data, error } = await db.from("profile_wall")
      .select("id, author_username, author_level, text, media_url, created_at")
      .eq("profile_username", profileUsername)
      .order("created_at", { ascending: false }).limit(100)
    if (error) return json({ error: error.message }, 500)
    return json((data ?? []).map(m => ({
      id: m.id, author: m.author_username, level: m.author_level,
      text: m.text, media_url: m.media_url ?? null,
      createdAt: new Date(m.created_at).getTime(),
    })))
  }

  // POST — üzenet küldése
  if (req.method === "POST") {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    const body = await req.json().catch(() => ({}))
    const t = String(body.text ?? "").trim()
    const media_url = body.media_url ? String(body.media_url).trim() : null
    if (!t && !media_url) return json({ error: "Szöveg vagy kép szükséges" }, 400)
    if (t.length > 500) return json({ error: "Érvénytelen szöveg" }, 400)

    const { data: u } = await db.from("users").select("xp").eq("id", user.id).single()
    const { data: msg, error } = await db.from("profile_wall").insert({
      profile_username: profileUsername,
      author_id:        String(user.id),
      author_username:  user.username,
      author_level:     getLevel(u?.xp ?? 0),
      text: t,
      media_url,
    }).select().single()
    if (error) return json({ error: error.message }, 500)

    const newXp = await awardXp(db, user.id, 3)
    if (profileUsername !== user.username) {
      const { data: owner } = await db.from("users").select("id").eq("username", profileUsername).maybeSingle()
      if (owner) await awardXp(db, Number(owner.id), 2)
    }

    return json({
      id: msg.id, author: msg.author_username, level: msg.author_level,
      text: msg.text, media_url: msg.media_url ?? null,
      createdAt: new Date(msg.created_at).getTime(),
      user_xp: newXp,
    })
  }

  // DELETE — törlés
  if (req.method === "DELETE") {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    if (!msgId) return json({ error: "Hiányzó azonosító" }, 400)
    const { data: msg } = await db.from("profile_wall")
      .select("author_id, profile_username").eq("id", msgId).single()
    if (!msg) return json({ error: "Nem található" }, 404)
    const ok = String(msg.author_id) === String(user.id)
      || msg.profile_username === user.username
      || user.role === "superadmin"
    if (!ok) return json({ error: "Nincs jogosultság" }, 403)
    await db.from("profile_wall").delete().eq("id", msgId)
    return new Response(null, { status: 204, headers: cors })
  }

  return json({ error: "Nem található" }, 404)
})