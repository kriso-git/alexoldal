import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jwt from "npm:jsonwebtoken"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const JWT_SECRET   = Deno.env.get("JWT_ACCESS_SECRET")!

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Replaced RPC-based awardXp with direct read-then-write (no SQL function needed)
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
  const url  = new URL(req.url)
  const parts = url.pathname.split("/").filter(Boolean)

  // GET /posts
  if (req.method === "GET" && !parts[1]) {
    const category = url.searchParams.get("category")
    let q = db.from("posts").select("*")
    if (category) q = q.eq("category", category)
    q = q.order("pinned", { ascending: false })
         .order("sort_index", { ascending: true })
         .order("created_at", { ascending: false })
    const { data: posts, error } = await q
    if (error) return json({ error: error.message }, 500)

    const authorIds = [...new Set((posts ?? []).map((p: Record<string,unknown>) => p.author_id).filter(Boolean))]
    const { data: users } = authorIds.length
      ? await db.from("users").select("id, username, role, xp, avatar_url").in("id", authorIds)
      : { data: [] }
    const userMap: Record<string, { username: string; role: string; xp: number; avatar_url: string | null }> =
      Object.fromEntries((users ?? []).map((u: Record<string,unknown>) => [String(u.id), {
        username: u.username as string,
        role: u.role as string,
        xp: (u.xp as number) ?? 0,
        avatar_url: u.avatar_url as string | null ?? null,
      }]))

    const postIds = (posts ?? []).map((p: Record<string,unknown>) => p.id)
    const [{ data: allReactions }, { data: myR }, { data: commentRows }] = await Promise.all([
      postIds.length
        ? db.from("post_reactions").select("post_id, reaction_key").in("post_id", postIds)
        : Promise.resolve({ data: [] }),
      (postIds.length && user)
        ? db.from("post_reactions").select("post_id, reaction_key").eq("user_id", user.id).in("post_id", postIds)
        : Promise.resolve({ data: [] }),
      postIds.length
        ? db.from("comments").select("post_id").in("post_id", postIds).is("parent_id", null)
        : Promise.resolve({ data: [] }),
    ])

    const reactMap: Record<string, Record<string, number>> = {}
    for (const r of allReactions ?? []) {
      reactMap[r.post_id] ??= {}
      reactMap[r.post_id][r.reaction_key] = (reactMap[r.post_id][r.reaction_key] ?? 0) + 1
    }
    const myMap: Record<string, string[]> = {}
    for (const r of myR ?? []) { myMap[r.post_id] ??= []; myMap[r.post_id].push(r.reaction_key) }
    const cntMap: Record<string, number> = {}
    for (const c of commentRows ?? []) cntMap[c.post_id] = (cntMap[c.post_id] ?? 0) + 1

    return json((posts ?? []).map((p: Record<string,unknown>) => {
      const u = userMap[String(p.author_id)]
      return {
        ...p,
        author: u?.username ?? "",
        author_username: u?.username ?? "",
        author_role: u?.role ?? "user",
        author_avatar: u?.avatar_url ?? null,
        level: getLevel(u?.xp ?? 0),
        reactions: reactMap[p.id as string] ?? {},
        comment_count: cntMap[p.id as string] ?? 0,
        my_reactions: myMap[p.id as string] ?? [],
      }
    }))
  }

  // POST /posts
  if (req.method === "POST" && !parts[1]) {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    const { data: u } = await db.from("users").select("role, can_post, ban_until, xp, username, avatar_url").eq("id", user.id).single()
    if (!u) return json({ error: "Felhasználó nem található" }, 404)
    if (u.ban_until && u.ban_until > Date.now()) return json({ error: "Fiókod tiltva van" }, 403)
    if (u.role !== "admin" && u.role !== "superadmin" && !u.can_post) return json({ error: "Nincs jogosultságod posztoláshoz" }, 403)

    const b = await req.json().catch(() => ({}))
    if (!b.title?.trim()) return json({ error: "Cím szükséges" }, 400)

    const { data: maxOrder } = await db.from("posts").select("sort_index").order("sort_index", { ascending: false }).limit(1).single()

    const { data: post, error } = await db.from("posts").insert({
      id: genId("p"),
      title: b.title.trim(),
      body: b.body?.trim() || null,
      category: b.category || "posts",
      media_type: b.mediaType || "none",
      media_src: b.mediaSrc || null,
      media_label: b.mediaLabel || null,
      author_id: user.id,
      pinned: false,
      sort_index: (maxOrder?.sort_index ?? 0) + 1,
      created_at: Date.now(),
    }).select().single()
    if (error) return json({ error: error.message }, 500)

    const newXp = await awardXp(db, user.id, 20)

    return json({
      ...post,
      author: u.username,
      author_username: u.username,
      author_role: u.role,
      author_avatar: u.avatar_url ?? null,
      level: getLevel(newXp),
      user_xp: newXp,
      reactions: {},
      comment_count: 0,
      my_reactions: [],
    })
  }

  // DELETE /posts/:id
  if (req.method === "DELETE" && parts[1] && !parts[2]) {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    const postId = decodeURIComponent(parts[1])
    const { data: p } = await db.from("posts").select("author_id").eq("id", postId).single()
    if (!p) return json({ error: "Nem található" }, 404)
    const isAdmin = user.role === "admin" || user.role === "superadmin"
    if (Number(p.author_id) !== user.id && !isAdmin) return json({ error: "Nincs jogosultság" }, 403)
    await Promise.all([
      db.from("post_reactions").delete().eq("post_id", postId),
      db.from("comments").delete().eq("post_id", postId),
    ])
    await db.from("posts").delete().eq("id", postId)
    return new Response(null, { status: 204, headers: cors })
  }

  // PUT /posts/order
  if (req.method === "PUT" && parts[1] === "order") {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    const isAdmin = user.role === "admin" || user.role === "superadmin"
    if (!isAdmin) return json({ error: "Nincs jogosultság" }, 403)
    const { order } = await req.json().catch(() => ({}))
    if (!Array.isArray(order)) return json({ error: "Érvénytelen adatok" }, 400)
    await Promise.all(order.map((id, i) => db.from("posts").update({ sort_index: i }).eq("id", id)))
    return json({ ok: true })
  }

  // POST /posts/:id/react
  if (req.method === "POST" && parts[2] === "react") {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    const postId = decodeURIComponent(parts[1])
    const { key } = await req.json().catch(() => ({}))
    const k = String(key ?? "").trim()
    if (!k || k.length > 512) return json({ error: "Érvénytelen reakció" }, 400)
    if (!["like","fire","skull","laugh"].includes(k) && !k.startsWith("http"))
      return json({ error: "Érvénytelen reakció" }, 400)

    const { data: p } = await db.from("posts").select("author_id").eq("id", postId).single()
    if (!p) return json({ error: "Poszt nem található" }, 404)

    const { data: ex } = await db.from("post_reactions")
      .select("post_id").eq("post_id", postId).eq("user_id", user.id).eq("reaction_key", k).maybeSingle()

    if (ex) {
      await db.from("post_reactions").delete()
        .eq("post_id", postId).eq("user_id", user.id).eq("reaction_key", k)
    } else {
      await db.from("post_reactions").insert({ post_id: postId, user_id: user.id, reaction_key: k, created_at: Date.now() })
      if (Number(p.author_id) !== user.id) await awardXp(db, Number(p.author_id), 5)
    }

    const { data: allR } = await db.from("post_reactions").select("reaction_key").eq("post_id", postId)
    const reactions: Record<string, number> = {}
    for (const r of allR ?? []) reactions[r.reaction_key] = (reactions[r.reaction_key] ?? 0) + 1

    const { data: myR } = await db.from("post_reactions").select("reaction_key").eq("post_id", postId).eq("user_id", user.id)
    return json({ reactions, my_reactions: (myR ?? []).map((r: Record<string,string>) => r.reaction_key) })
  }

  return json({ error: "Nem található" }, 404)
})
