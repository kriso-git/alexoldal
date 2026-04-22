// Presence endpoint — tracks online status per user.
// Required DB migration (run once in Supabase SQL editor):
//   CREATE TABLE IF NOT EXISTS user_presence (
//     username TEXT PRIMARY KEY,
//     last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
//   );

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jwt from "npm:jsonwebtoken"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const JWT_SECRET   = Deno.env.get("JWT_ACCESS_SECRET") ?? "8d113bc9c8f967506aba15a0db7d592650d5bea561a37f64e4d050cca1a98c2d1e7c3472a3f6802df1a77de2875de7dd"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const url = new URL(req.url)

  // POST /api/presence — heartbeat (update last_seen for current user)
  if (req.method === "POST") {
    const user = getUser(req)
    if (!user) return json({ error: "Unauthorized" }, 401)

    const { error } = await supabase
      .from("user_presence")
      .upsert({ username: user.username, last_seen: new Date().toISOString() }, { onConflict: "username" })

    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }

  // GET /api/presence?usernames=user1,user2,... — return presence for given users
  if (req.method === "GET") {
    const raw = url.searchParams.get("usernames") ?? ""
    const usernames = raw.split(",").map(s => s.trim()).filter(Boolean).slice(0, 50)
    if (usernames.length === 0) return json({})

    const { data, error } = await supabase
      .from("user_presence")
      .select("username, last_seen")
      .in("username", usernames)

    if (error) return json({}) // table may not exist yet — return empty gracefully

    const now = Date.now()
    const result: Record<string, { last_seen: string; isOnline: boolean }> = {}
    for (const row of (data ?? [])) {
      const lastSeenMs = new Date(row.last_seen).getTime()
      result[row.username] = {
        last_seen: row.last_seen,
        isOnline: now - lastSeenMs < ONLINE_THRESHOLD_MS,
      }
    }
    return json(result)
  }

  return json({ error: "Method not allowed" }, 405)
})
