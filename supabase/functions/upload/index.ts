import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jwt from "npm:jsonwebtoken"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const JWT_SECRET   = Deno.env.get("JWT_ACCESS_SECRET") ?? "8d113bc9c8f967506aba15a0db7d592650d5bea561a37f64e4d050cca1a98c2d1e7c3472a3f6802df1a77de2875de7dd"
const MAX_BYTES    = 10 * 1024 * 1024 // 10 MB

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
    "image/gif": "gif", "image/webp": "webp", "image/avif": "avif",
    "image/svg+xml": "svg",
  }
  return map[mime] ?? "bin"
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405)

  const user = getUser(req)
  if (!user) return json({ error: "Belépés szükséges" }, 401)

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return json({ error: "Érvénytelen form adatok" }, 400)
  }

  const file = formData.get("file")
  if (!file || typeof file === "string") return json({ error: "Hiányzó fájl" }, 400)

  const blob = file as File
  if (!blob.type.startsWith("image/")) return json({ error: "Csak kép fájl fogadható el" }, 400)

  const buffer = await blob.arrayBuffer()
  if (buffer.byteLength > MAX_BYTES) return json({ error: "Fájl túl nagy (max 10 MB)" }, 400)

  const ext = extFromMime(blob.type)
  const fileName = `${user.id}-${Date.now()}.${ext}`

  const db = createClient(SUPABASE_URL, SERVICE_KEY)
  const { error: uploadError } = await db.storage
    .from("uploads")
    .upload(fileName, buffer, { contentType: blob.type, upsert: true })

  if (uploadError) return json({ error: uploadError.message }, 500)

  const { data: { publicUrl } } = db.storage.from("uploads").getPublicUrl(fileName)
  return json({ url: publicUrl })
})
