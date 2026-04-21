import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jwt from "npm:jsonwebtoken"
import bcrypt from "npm:bcryptjs"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const JWT_SECRET   = Deno.env.get("JWT_ACCESS_SECRET")!

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  const db   = createClient(SUPABASE_URL, SERVICE_KEY)
  const user = getUser(req)
  const url  = new URL(req.url)
  const parts = url.pathname.split("/").filter(Boolean)
  // parts[0] = "profile", parts[1] = username (or undefined)

  // GET /profile?search=query — user search
  if (req.method === "GET" && !parts[1]) {
    const q = (url.searchParams.get("search") ?? "").trim()
    if (!q || q.length < 1) return json([])
    const { data, error } = await db
      .from("users")
      .select("username, role, xp, avatar_url")
      .ilike("username", `${q}%`)
      .order("username", { ascending: true })
      .limit(10)
    if (error) return json({ error: error.message }, 500)
    return json((data ?? []).map((u: Record<string,unknown>) => ({
      username: u.username,
      role: u.role,
      xp: u.xp ?? 0,
      avatar_url: u.avatar_url ?? null,
      level: getLevel((u.xp as number) ?? 0),
    })))
  }

  // GET /profile/:username — profil lekérés
  if (req.method === "GET" && parts[1]) {
    const username = decodeURIComponent(parts[1])
    const { data: u, error } = await db
      .from("users")
      .select("id, username, role, xp, avatar_url, created_at, can_post, ban_until")
      .eq("username", username)
      .single()
    if (error || !u) return json({ error: "Felhasználó nem található" }, 404)
    return json({
      id: u.id,
      username: u.username,
      role: u.role,
      xp: u.xp ?? 0,
      level: getLevel(u.xp ?? 0),
      avatar_url: u.avatar_url ?? null,
      created_at: u.created_at,
      can_post: u.can_post,
      ban_until: u.ban_until,
    })
  }

  // PATCH /profile/:username — profil módosítás
  if (req.method === "PATCH" && parts[1]) {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    const targetUsername = decodeURIComponent(parts[1])

    const { data: target } = await db.from("users").select("id, username, role").eq("username", targetUsername).single()
    if (!target) return json({ error: "Felhasználó nem található" }, 404)

    const isSelf = user.id === Number(target.id)
    const isSuperadmin = user.role === "superadmin"
    if (!isSelf && !isSuperadmin) return json({ error: "Nincs jogosultság" }, 403)

    const body = await req.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}

    if (body.avatar_url !== undefined) {
      updates.avatar_url = body.avatar_url
    }

    if (body.username !== undefined) {
      const newName = String(body.username).trim()
      if (!newName || newName.length < 3 || newName.length > 30 || !/^\w+$/.test(newName))
        return json({ error: "Érvénytelen felhasználónév (3-30 karakter, csak betű/szám/_)" }, 400)
      if (newName !== target.username) {
        const { data: existing } = await db.from("users").select("id").eq("username", newName).maybeSingle()
        if (existing) return json({ error: "Ez a felhasználónév már foglalt" }, 409)
        updates.username = newName
      }
    }

    if (body.password !== undefined) {
      const pw = String(body.password)
      if (pw.length < 8) return json({ error: "A jelszó legalább 8 karakter legyen" }, 400)
      updates.password_hash = await bcrypt.hash(pw, 12)
    }

    if (Object.keys(updates).length === 0) return json({ ok: true })

    const { error: updateError } = await db.from("users").update(updates).eq("id", target.id)
    if (updateError) return json({ error: updateError.message }, 500)
    return json({ ok: true })
  }

  return json({ error: "Nem található" }, 404)
})
