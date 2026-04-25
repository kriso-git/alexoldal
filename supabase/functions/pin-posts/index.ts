import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jwt from "npm:jsonwebtoken"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const JWT_SECRET   = Deno.env.get("JWT_ACCESS_SECRET")!

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
}
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "PATCH") return json({ error: "Módszer nem engedélyezett" }, 405)

  const h = req.headers.get("Authorization") ?? ""
  if (!h.startsWith("Bearer ")) return json({ error: "Belépés szükséges" }, 401)

  let user: { id: number; username: string; role: string }
  try {
    const p = jwt.verify(h.slice(7), JWT_SECRET) as { sub?: number | string; id?: number; username: string; role: string }
    const rawId = p.sub ?? p.id
    const id = Number(rawId)
    if (!rawId || isNaN(id)) return json({ error: "Érvénytelen token" }, 401)
    user = { id, username: p.username, role: p.role }
  } catch {
    return json({ error: "Érvénytelen token" }, 401)
  }

  if (user.role !== "superadmin") return json({ error: "Csak superadmin tűzhet ki posztot" }, 403)

  const { id, pinned } = await req.json().catch(() => ({}))
  if (!id || typeof pinned !== "boolean") return json({ error: "Érvénytelen adatok" }, 400)

  const db = createClient(SUPABASE_URL, SERVICE_KEY)
  const { error } = await db.from("posts").update({ pinned }).eq("id", id)
  if (error) return json({ error: error.message }, 500)
  return json({ ok: true })
})