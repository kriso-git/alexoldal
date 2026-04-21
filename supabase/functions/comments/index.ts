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

  // GET /comments/posts/:postId/comments
  if (req.method === "GET" && parts[1] === "posts") {
    const postId = decodeURIComponent(parts[2] ?? "")

    const [{ data: roots }, { data: replies }] = await Promise.all([
      db.from("comments").select("*").eq("post_id", postId).is("parent_id", null).order("created_at", { ascending: true }),
      db.from("comments").select("*").eq("post_id", postId).not("parent_id", "is", null).order("created_at", { ascending: true }),
    ])
    const allComments = [...(roots ?? []), ...(replies ?? [])]

    const authorIds = [...new Set(allComments.map((c: Record<string,unknown>) => c.author_id).filter(Boolean))]
    const { data: users } = authorIds.length
      ? await db.from("users").select("id, username, role, xp, avatar_url").in("id", authorIds)
      : { data: [] }
    const userMap: Record<string, { username: string; role: string; xp: number; avatar_url: string | null }> =
      Object.fromEntries((users ?? []).map((u: Record<string,unknown>) => [String(u.id), {
        username: u.username as string,
        role: u.role as string,
        xp: (u.xp as number) ?? 0,
        avatar_url: (u.avatar_url as (string | null)) ?? null,
      }]))

    const ids = allComments.map((c: Record<string,unknown>) => c.id)
    const [{ data: allR }, { data: myR }] = await Promise.all([
      ids.length ? db.from("comment_reactions").select("comment_id, emoji").in("comment_id", ids) : Promise.resolve({ data: [] }),
      (ids.length && user) ? db.from("comment_reactions").select("comment_id, emoji").in("comment_id", ids).eq("user_id", user.id) : Promise.resolve({ data: [] }),
    ])

    const reactionMap: Record<string, Record<string, number>> = {}
    for (const r of allR ?? []) {
      reactionMap[r.comment_id] ??= {}
      reactionMap[r.comment_id][r.emoji] = (reactionMap[r.comment_id][r.emoji] ?? 0) + 1
    }
    const myMap: Record<string, string[]> = {}
    for (const r of myR ?? []) { myMap[r.comment_id] ??= []; myMap[r.comment_id].push(r.emoji) }

    const fmt = (c: Record<string, unknown>) => {
      const u = userMap[String(c.author_id)]
      return {
        id: c.id, post_id: c.post_id, parent_id: c.parent_id ?? null,
        author: u?.username ?? "", author_role: u?.role ?? "user",
        author_avatar: u?.avatar_url ?? null,
        author_is_admin: u?.role !== "user",
        level: getLevel(u?.xp ?? 0),
        text: c.text, created_at: c.created_at,
        reactions: reactionMap[c.id as string] ?? {},
        my_reactions: myMap[c.id as string] ?? [],
        replies: [] as unknown[],
      }
    }

    const replyMap: Record<string, ReturnType<typeof fmt>[]> = {}
    for (const r of replies ?? []) {
      const pid = String(r.parent_id)
      replyMap[pid] ??= []
      replyMap[pid].push(fmt(r))
    }
    return json((roots ?? []).map((c: Record<string,unknown>) => ({ ...fmt(c), replies: replyMap[String(c.id)] ?? [] })))
  }

  // POST /comments/posts/:postId/comments
  if (req.method === "POST" && parts[1] === "posts") {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    const postId = decodeURIComponent(parts[2] ?? "")
    const { text } = await req.json().catch(() => ({}))
    const t = String(text ?? "").trim()
    if (!t || t.length > 2000) return json({ error: "Érvénytelen szöveg" }, 400)

    const { data: c, error } = await db.from("comments").insert({
      id: genId("c"),
      post_id: postId,
      parent_id: null,
      author_id: String(user.id),
      text: t,
      created_at: Date.now(),
    }).select().single()
    if (error) return json({ error: error.message }, 500)

    const newXp = await awardXp(db, user.id, 10)
    const { data: u } = await db.from("users").select("username, role, avatar_url").eq("id", user.id).single()

    return json({
      id: c.id, post_id: c.post_id, parent_id: null,
      author: u?.username ?? user.username,
      author_role: u?.role ?? user.role,
      author_avatar: u?.avatar_url ?? null,
      author_is_admin: (u?.role ?? user.role) !== "user",
      level: getLevel(newXp),
      user_xp: newXp,
      text: c.text, created_at: c.created_at,
      reactions: {}, my_reactions: [], replies: [],
    })
  }

  // POST /comments/:commentId/reply
  if (req.method === "POST" && parts[2] === "reply") {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    const commentId = decodeURIComponent(parts[1] ?? "")
    const { text } = await req.json().catch(() => ({}))
    const t = String(text ?? "").trim()
    if (!t || t.length > 2000) return json({ error: "Érvénytelen szöveg" }, 400)

    const { data: parent } = await db.from("comments").select("post_id").eq("id", commentId).single()
    if (!parent) return json({ error: "Komment nem található" }, 404)

    const { data: r, error } = await db.from("comments").insert({
      id: genId("c"),
      post_id: parent.post_id,
      parent_id: commentId,
      author_id: String(user.id),
      text: t,
      created_at: Date.now(),
    }).select().single()
    if (error) return json({ error: error.message }, 500)

    const newXp = await awardXp(db, user.id, 10)
    const { data: u } = await db.from("users").select("username, role, avatar_url").eq("id", user.id).single()

    return json({
      id: r.id, post_id: r.post_id, parent_id: r.parent_id,
      author: u?.username ?? user.username,
      author_role: u?.role ?? user.role,
      author_avatar: u?.avatar_url ?? null,
      author_is_admin: (u?.role ?? user.role) !== "user",
      level: getLevel(newXp),
      user_xp: newXp,
      text: r.text, created_at: r.created_at,
      reactions: {}, my_reactions: [], replies: [],
    })
  }

  // POST /comments/:commentId/react
  if (req.method === "POST" && parts[2] === "react") {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    const commentId = decodeURIComponent(parts[1] ?? "")
    const { emoji } = await req.json().catch(() => ({}))
    const em = String(emoji ?? "").trim()
    if (!em || em.length > 512) return json({ error: "Érvénytelen emoji" }, 400)

    const { data: ex } = await db.from("comment_reactions")
      .select("comment_id").eq("comment_id", commentId).eq("user_id", user.id).eq("emoji", em).maybeSingle()

    if (ex) {
      await db.from("comment_reactions").delete()
        .eq("comment_id", commentId).eq("user_id", user.id).eq("emoji", em)
    } else {
      await db.from("comment_reactions").insert({ comment_id: commentId, user_id: user.id, emoji: em, created_at: Date.now() })
      const { data: co } = await db.from("comments").select("author_id").eq("id", commentId).single()
      if (co && Number(co.author_id) !== user.id) await awardXp(db, Number(co.author_id), 5)
    }

    const { data: all } = await db.from("comment_reactions").select("emoji, user_id").eq("comment_id", commentId)
    const reactions: Record<string, number> = {}
    const my_reactions: string[] = []
    for (const r of all ?? []) {
      reactions[r.emoji] = (reactions[r.emoji] ?? 0) + 1
      if (r.user_id === user.id) my_reactions.push(r.emoji)
    }
    return json({ reactions, my_reactions })
  }

  // DELETE /comments/:commentId
  if (req.method === "DELETE") {
    if (!user) return json({ error: "Belépés szükséges" }, 401)
    const commentId = decodeURIComponent(parts[1] ?? "")
    const { data: c } = await db.from("comments").select("author_id").eq("id", commentId).single()
    if (!c) return json({ error: "Nem található" }, 404)
    const isAdmin = user.role === "admin" || user.role === "superadmin"
    if (Number(c.author_id) !== user.id && !isAdmin) return json({ error: "Nincs jogosultság" }, 403)
    await db.from("comment_reactions").delete().eq("comment_id", commentId)
    await db.from("comments").delete().eq("id", commentId)
    return new Response(null, { status: 204, headers: cors })
  }

  return json({ error: "Nem található" }, 404)
})
