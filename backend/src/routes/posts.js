import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb, audit } from '../db/index.js'
import { requireAdmin, optionalAuth, requireAuth } from '../middleware/auth.js'
import crypto from 'crypto'

export const postsRouter = Router()

const VALID_CATEGORIES = ['videos', 'posts']
const VALID_REACTIONS = ['like', 'fire', 'skull', 'laugh']

function mkId() {
  return `p-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
}

function formatPost(row, reactions, myReactions, commentCount) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    body: row.body || '',
    mediaType: row.media_type,
    mediaSrc: row.media_src || null,
    mediaLabel: row.media_label || null,
    mediaPoster: row.media_poster || null,
    author: row.username || 'unknown',
    adminPost: row.role === 'admin' || row.role === 'superadmin',
    createdAt: row.created_at,
    reactions: reactions || { like: 0, fire: 0, skull: 0, laugh: 0 },
    myReactions: myReactions || [],
    commentCount: commentCount || 0,
  }
}

function getReactions(db, postId) {
  const rows = db.prepare(
    'SELECT reaction_key, COUNT(*) as cnt FROM post_reactions WHERE post_id=? GROUP BY reaction_key'
  ).all(postId)
  const r = { like: 0, fire: 0, skull: 0, laugh: 0 }
  for (const row of rows) r[row.reaction_key] = row.cnt
  return r
}

function getMyReactions(db, postId, userId) {
  if (!userId) return []
  return db.prepare('SELECT reaction_key FROM post_reactions WHERE post_id=? AND user_id=?')
    .all(postId, userId).map(r => r.reaction_key)
}

function getCommentCount(db, postId) {
  return db.prepare('SELECT COUNT(*) as n FROM comments WHERE post_id=?').get(postId)?.n || 0
}

// GET /api/posts?category=all
postsRouter.get('/', optionalAuth, (req, res) => {
  const db = getDb()
  const { category } = req.query
  const baseQuery =
    'SELECT p.*, u.username, u.role FROM posts p LEFT JOIN users u ON u.id=p.author_id'
  let rows
  if (category && category !== 'all') {
    rows = db.prepare(`${baseQuery} WHERE p.category=? ORDER BY p.created_at DESC`).all(category)
  } else {
    rows = db.prepare(`${baseQuery} ORDER BY p.created_at DESC`).all()
  }

  const orderRow = db.prepare("SELECT value FROM settings WHERE key='post_order'").get()
  const order = orderRow ? JSON.parse(orderRow.value) : []
  if (order.length > 0) {
    const idxMap = new Map(order.map((id, i) => [id, i]))
    rows.sort((a, b) => {
      const ai = idxMap.has(a.id) ? idxMap.get(a.id) : 999999
      const bi = idxMap.has(b.id) ? idxMap.get(b.id) : 999999
      return ai - bi || b.created_at - a.created_at
    })
  }

  const userId = req.user?.sub
  const posts = rows.map(row => formatPost(
    row,
    getReactions(db, row.id),
    getMyReactions(db, row.id, userId),
    getCommentCount(db, row.id)
  ))
  res.json(posts)
})

// PUT /api/posts/order — must be BEFORE /:id routes
postsRouter.put('/order', requireAdmin,
  body('order').isArray(),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Invalid order' })
    const db = getDb()
    const order = req.body.order.map(String).filter(id => /^[a-zA-Z0-9_-]+$/.test(id))
    db.prepare("UPDATE settings SET value=? WHERE key='post_order'").run(JSON.stringify(order))
    audit(db, { actorId: req.user.sub, actorUsername: req.user.username, action: 'reorder_posts', ip: req.ip })
    res.json({ ok: true })
  }
)

// POST /api/posts — admin only
postsRouter.post('/',
  requireAdmin,
  body('title').trim().isLength({ min: 1, max: 300 }),
  body('category').isIn(VALID_CATEGORIES),
  body('body').optional({ nullable: true }).isLength({ max: 20000 }),
  body('mediaType').optional({ nullable: true }).isIn(['none', 'video', 'image', 'placeholder', 'youtube']),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: errors.array()[0].msg })

    const db = getDb()
    const { title, category, body: bodyText, mediaType, mediaSrc, mediaLabel } = req.body

    // Validate mediaSrc if provided — allow empty or valid URL
    if (mediaSrc && mediaSrc.trim()) {
      try { new URL(mediaSrc) } catch { return res.status(422).json({ error: 'Invalid media URL' }) }
    }

    const id = mkId()
    db.prepare(
      'INSERT INTO posts (id, title, category, body, media_type, media_src, media_label, author_id, sort_index, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).run(id, title.trim(), category, bodyText?.trim() || '', mediaType || 'none',
      mediaSrc?.trim() || null, mediaLabel?.trim() || null, req.user.sub, 0, Date.now())

    const orderRow = db.prepare("SELECT value FROM settings WHERE key='post_order'").get()
    const order = orderRow ? JSON.parse(orderRow.value) : []
    order.unshift(id)
    db.prepare("UPDATE settings SET value=? WHERE key='post_order'").run(JSON.stringify(order))

    audit(db, { actorId: req.user.sub, actorUsername: req.user.username, action: 'create_post', targetType: 'post', targetId: id, ip: req.ip })

    const row = db.prepare('SELECT p.*, u.username, u.role FROM posts p LEFT JOIN users u ON u.id=p.author_id WHERE p.id=?').get(id)
    res.status(201).json(formatPost(row, { like: 0, fire: 0, skull: 0, laugh: 0 }, [], 0))
  }
)

// DELETE /api/posts/:id — admin only
postsRouter.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb()
  const post = db.prepare('SELECT id FROM posts WHERE id=?').get(req.params.id)
  if (!post) return res.status(404).json({ error: 'Post not found' })

  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id)

  const orderRow = db.prepare("SELECT value FROM settings WHERE key='post_order'").get()
  if (orderRow) {
    const order = JSON.parse(orderRow.value).filter(x => x !== req.params.id)
    db.prepare("UPDATE settings SET value=? WHERE key='post_order'").run(JSON.stringify(order))
  }

  audit(db, { actorId: req.user.sub, actorUsername: req.user.username, action: 'delete_post', targetType: 'post', targetId: req.params.id, ip: req.ip })
  res.status(204).end()
})

// POST /api/posts/:id/react — auth required
postsRouter.post('/:id/react',
  requireAuth,
  body('key').isIn(VALID_REACTIONS),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Invalid reaction' })

    const db = getDb()
    const post = db.prepare('SELECT id FROM posts WHERE id=?').get(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const { key } = req.body
    const userId = req.user.sub
    const existing = db.prepare(
      'SELECT 1 FROM post_reactions WHERE post_id=? AND user_id=? AND reaction_key=?'
    ).get(req.params.id, userId, key)

    if (existing) {
      db.prepare('DELETE FROM post_reactions WHERE post_id=? AND user_id=? AND reaction_key=?').run(req.params.id, userId, key)
    } else {
      db.prepare('INSERT INTO post_reactions (post_id, user_id, reaction_key, created_at) VALUES (?,?,?,?)').run(req.params.id, userId, key, Date.now())
    }

    audit(db, {
      actorId: userId, actorUsername: req.user.username,
      action: existing ? 'unreact_post' : 'react_post',
      targetType: 'post', targetId: req.params.id,
      details: { key }, ip: req.ip,
    })

    res.json({
      reactions: getReactions(db, req.params.id),
      myReactions: getMyReactions(db, req.params.id, userId),
    })
  }
)
