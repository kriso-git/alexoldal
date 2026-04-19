import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb, audit } from '../db/index.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import crypto from 'crypto'

export const commentsRouter = Router()

function mkId() {
  return `c-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
}

function formatComment(row, reactions, myReactions, replies = []) {
  return {
    id: row.id,
    author: row.username || '[törölt]',
    authorIsAdmin: row.role === 'admin' || row.role === 'superadmin',
    createdAt: row.created_at,
    text: row.text,
    reactions: reactions || {},
    myReactions: myReactions || [],
    replies,
  }
}

function getCommentReactions(db, commentId) {
  const rows = db.prepare(
    'SELECT emoji, COUNT(*) as cnt FROM comment_reactions WHERE comment_id=? GROUP BY emoji'
  ).all(commentId)
  const r = {}
  for (const row of rows) r[row.emoji] = row.cnt
  return r
}

function getMyCommentReactions(db, commentId, userId) {
  if (!userId) return []
  return db.prepare('SELECT emoji FROM comment_reactions WHERE comment_id=? AND user_id=?')
    .all(commentId, userId).map(r => r.emoji)
}

function buildCommentTree(db, postId, userId) {
  const all = db.prepare(
    'SELECT c.*, u.username, u.role FROM comments c LEFT JOIN users u ON u.id=c.author_id WHERE c.post_id=? ORDER BY c.created_at ASC'
  ).all(postId)

  const topLevel = []
  const byId = new Map()

  for (const row of all) {
    const reactions = getCommentReactions(db, row.id)
    const myReacts = getMyCommentReactions(db, row.id, userId)
    const node = formatComment(row, reactions, myReacts, [])
    byId.set(row.id, node)
    if (!row.parent_id) topLevel.push(node)
    else {
      const parent = byId.get(row.parent_id)
      if (parent) parent.replies.push(node)
    }
  }
  return topLevel
}

// GET /api/posts/:postId/comments
commentsRouter.get('/posts/:postId/comments', optionalAuth, (req, res) => {
  const db = getDb()
  const post = db.prepare('SELECT id FROM posts WHERE id=?').get(req.params.postId)
  if (!post) return res.status(404).json({ error: 'Post not found' })
  const tree = buildCommentTree(db, req.params.postId, req.user?.sub)
  res.json(tree)
})

// POST /api/posts/:postId/comments — auth required
commentsRouter.post('/posts/:postId/comments',
  requireAuth,
  body('text').trim().isLength({ min: 1, max: 2000 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: errors.array()[0].msg })

    const db = getDb()
    const post = db.prepare('SELECT id FROM posts WHERE id=?').get(req.params.postId)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const id = mkId()
    db.prepare(
      'INSERT INTO comments (id, post_id, parent_id, author_id, text, created_at) VALUES (?,?,NULL,?,?,?)'
    ).run(id, req.params.postId, req.user.sub, req.body.text.trim(), Date.now())

    audit(db, {
      actorId: req.user.sub, actorUsername: req.user.username,
      action: 'add_comment', targetType: 'post', targetId: req.params.postId,
      details: { commentId: id }, ip: req.ip,
    })

    const row = db.prepare('SELECT c.*, u.username, u.role FROM comments c LEFT JOIN users u ON u.id=c.author_id WHERE c.id=?').get(id)
    res.status(201).json(formatComment(row, {}, [], []))
  }
)

// POST /api/comments/:id/reply — auth required
commentsRouter.post('/comments/:id/reply',
  requireAuth,
  body('text').trim().isLength({ min: 1, max: 2000 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: errors.array()[0].msg })

    const db = getDb()
    const parent = db.prepare('SELECT id, post_id, parent_id FROM comments WHERE id=?').get(req.params.id)
    if (!parent) return res.status(404).json({ error: 'Comment not found' })
    if (parent.parent_id) return res.status(400).json({ error: 'Cannot reply to a reply' })

    const id = mkId()
    db.prepare(
      'INSERT INTO comments (id, post_id, parent_id, author_id, text, created_at) VALUES (?,?,?,?,?,?)'
    ).run(id, parent.post_id, parent.id, req.user.sub, req.body.text.trim(), Date.now())

    audit(db, {
      actorId: req.user.sub, actorUsername: req.user.username,
      action: 'reply_comment', targetType: 'comment', targetId: parent.id,
      details: { replyId: id, postId: parent.post_id }, ip: req.ip,
    })

    const row = db.prepare('SELECT c.*, u.username, u.role FROM comments c LEFT JOIN users u ON u.id=c.author_id WHERE c.id=?').get(id)
    res.status(201).json(formatComment(row, {}, [], []))
  }
)

// DELETE /api/comments/:id — own comment or admin
commentsRouter.delete('/comments/:id', requireAuth, (req, res) => {
  const db = getDb()
  const comment = db.prepare('SELECT id, author_id, post_id FROM comments WHERE id=?').get(req.params.id)
  if (!comment) return res.status(404).json({ error: 'Comment not found' })

  const isOwn = comment.author_id === req.user.sub
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin'
  if (!isOwn && !isAdmin) return res.status(403).json({ error: 'Not authorized' })

  db.prepare('DELETE FROM comments WHERE id=?').run(req.params.id)
  audit(db, { actorId: req.user.sub, actorUsername: req.user.username, action: 'delete_comment', targetType: 'comment', targetId: req.params.id, ip: req.ip })
  res.status(204).end()
})

// POST /api/comments/:id/react — auth required
commentsRouter.post('/comments/:id/react',
  requireAuth,
  body('emoji').trim().isLength({ min: 1, max: 10 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Invalid emoji' })

    const db = getDb()
    const comment = db.prepare('SELECT id FROM comments WHERE id=?').get(req.params.id)
    if (!comment) return res.status(404).json({ error: 'Comment not found' })

    const { emoji } = req.body
    const userId = req.user.sub
    const existing = db.prepare(
      'SELECT 1 FROM comment_reactions WHERE comment_id=? AND user_id=? AND emoji=?'
    ).get(req.params.id, userId, emoji)

    if (existing) {
      db.prepare('DELETE FROM comment_reactions WHERE comment_id=? AND user_id=? AND emoji=?').run(req.params.id, userId, emoji)
    } else {
      db.prepare('INSERT INTO comment_reactions (comment_id, user_id, emoji, created_at) VALUES (?,?,?,?)').run(req.params.id, userId, emoji, Date.now())
    }

    audit(db, {
      actorId: userId, actorUsername: req.user.username,
      action: existing ? 'unreact_comment' : 'react_comment',
      targetType: 'comment', targetId: req.params.id,
      details: { emoji }, ip: req.ip,
    })

    res.json({
      reactions: getCommentReactions(db, req.params.id),
      myReactions: getMyCommentReactions(db, req.params.id, userId),
    })
  }
)
