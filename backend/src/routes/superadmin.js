import { Router } from 'express'
import { body, query, validationResult } from 'express-validator'
import { getDb, audit } from '../db/index.js'
import { requireSuperadmin } from '../middleware/auth.js'

export const superadminRouter = Router()

// All superadmin routes require superadmin role
superadminRouter.use(requireSuperadmin)

// GET /api/superadmin/users
superadminRouter.get('/users', (req, res) => {
  const db = getDb()
  const users = db.prepare(
    'SELECT id, username, role, is_banned, can_post, failed_logins, locked_until, created_at, last_login FROM users ORDER BY created_at DESC'
  ).all()
  res.json(users.map(u => ({ ...u, can_post: !!u.can_post })))
})

// PATCH /api/superadmin/users/:id/role
superadminRouter.patch('/users/:id/role',
  body('role').isIn(['user', 'admin', 'superadmin']),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Érvénytelen szerepkör' })

    const db = getDb()
    const target = db.prepare('SELECT id, username, role FROM users WHERE id=?').get(req.params.id)
    if (!target) return res.status(404).json({ error: 'User not found' })
    if (target.id === req.user.sub) return res.status(400).json({ error: 'Saját szerepkört nem módosíthatod' })
    if (target.role === 'superadmin' && req.body.role !== 'superadmin') {
      return res.status(403).json({ error: 'Superadmin rangot csak superadmin vehet el' })
    }

    db.prepare('UPDATE users SET role=? WHERE id=?').run(req.body.role, target.id)
    audit(db, {
      actorId: req.user.sub, actorUsername: req.user.username,
      action: 'set_user_role', targetType: 'user', targetId: String(target.id),
      details: { from: target.role, to: req.body.role, username: target.username },
      ip: req.ip,
    })
    res.json({ ok: true, role: req.body.role })
  }
)

// PATCH /api/superadmin/users/:id/ban
// body: { banned: bool, minutes?: number }  — minutes omitted = permanent
superadminRouter.patch('/users/:id/ban',
  body('banned').isBoolean(),
  body('minutes').optional().isInt({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Érvénytelen kérés' })

    const db = getDb()
    const target = db.prepare('SELECT id, username, role, is_banned FROM users WHERE id=?').get(req.params.id)
    if (!target) return res.status(404).json({ error: 'User not found' })
    if (target.role === 'superadmin') return res.status(403).json({ error: 'Superadmint nem lehet tiltani' })
    if (target.id === req.user.sub) return res.status(400).json({ error: 'Magadat nem tilthatod' })

    const banned = req.body.banned === true || req.body.banned === 'true'
    const minutes = req.body.minutes ? parseInt(req.body.minutes) : null
    const banUntil = banned && minutes ? Date.now() + minutes * 60 * 1000 : null

    db.prepare('UPDATE users SET is_banned=?, ban_until=? WHERE id=?').run(
      banned ? 1 : 0, banned ? banUntil : null, target.id
    )
    if (banned) db.prepare('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?').run(target.id)

    audit(db, {
      actorId: req.user.sub, actorUsername: req.user.username,
      action: banned ? 'ban_user' : 'unban_user', targetType: 'user', targetId: String(target.id),
      details: { username: target.username, minutes: minutes || 'permanent' },
      ip: req.ip,
    })
    res.json({ ok: true, is_banned: banned, ban_until: banUntil })
  }
)

// DELETE /api/superadmin/users/:id
superadminRouter.delete('/users/:id', (req, res) => {
  const db = getDb()
  const target = db.prepare('SELECT id, username, role FROM users WHERE id=?').get(req.params.id)
  if (!target) return res.status(404).json({ error: 'User not found' })
  if (target.role === 'superadmin') return res.status(403).json({ error: 'Cannot delete superadmin' })
  if (target.id === req.user.sub) return res.status(400).json({ error: 'Cannot delete yourself' })

  db.prepare('DELETE FROM users WHERE id=?').run(target.id)
  audit(db, {
    actorId: req.user.sub, actorUsername: req.user.username,
    action: 'delete_user', targetType: 'user', targetId: String(target.id),
    details: { username: target.username },
    ip: req.ip,
  })
  res.status(204).end()
})

// GET /api/superadmin/audit?page=0&limit=50&action=&username=
superadminRouter.get('/audit',
  query('page').optional().isInt({ min: 0 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  (req, res) => {
    const page = parseInt(req.query.page || '0')
    const limit = parseInt(req.query.limit || '50')
    const db = getDb()

    const conditions = []
    const params = []
    if (req.query.action) { conditions.push('action=?'); params.push(req.query.action) }
    if (req.query.username) { conditions.push('actor_username LIKE ?'); params.push(`%${req.query.username}%`) }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = db.prepare(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, page * limit)
    const total = db.prepare(`SELECT COUNT(*) as n FROM audit_log ${where}`).get(...params).n

    res.json({ rows, total, page, limit })
  }
)

// GET /api/superadmin/stats
superadminRouter.get('/stats', (req, res) => {
  const db = getDb()
  const users = db.prepare('SELECT COUNT(*) as n FROM users').get().n
  const admins = db.prepare("SELECT COUNT(*) as n FROM users WHERE role IN ('admin','superadmin')").get().n
  const banned = db.prepare('SELECT COUNT(*) as n FROM users WHERE is_banned=1').get().n
  const posts = db.prepare('SELECT COUNT(*) as n FROM posts').get().n
  const comments = db.prepare('SELECT COUNT(*) as n FROM comments').get().n
  const reactions = db.prepare('SELECT COUNT(*) as n FROM post_reactions').get().n
  res.json({ users, admins, banned, posts, comments, reactions })
})

// PATCH /api/superadmin/users/:id/permissions
superadminRouter.patch('/users/:id/permissions',
  body('can_post').isBoolean(),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Érvénytelen kérés' })
    const db = getDb()
    const target = db.prepare('SELECT id, username, role FROM users WHERE id=?').get(req.params.id)
    if (!target) return res.status(404).json({ error: 'User not found' })
    if (target.role === 'superadmin') return res.status(403).json({ error: 'Superadmin jogait nem lehet módosítani' })
    const canPost = req.body.can_post === true || req.body.can_post === 'true'
    db.prepare('UPDATE users SET can_post=? WHERE id=?').run(canPost ? 1 : 0, target.id)
    audit(db, {
      actorId: req.user.sub, actorUsername: req.user.username,
      action: 'set_user_role', targetType: 'user', targetId: String(target.id),
      details: { username: target.username, can_post: canPost },
      ip: req.ip,
    })
    res.json({ ok: true, can_post: canPost })
  }
)

// POST /api/superadmin/users/:id/reset-password — for emergency resets
superadminRouter.post('/users/:id/reset-password',
  body('newPassword').isLength({ min: 8, max: 128 }),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Password must be at least 8 chars' })

    const db = getDb()
    const target = db.prepare('SELECT id, username, role FROM users WHERE id=?').get(req.params.id)
    if (!target) return res.status(404).json({ error: 'User not found' })
    if (target.role === 'superadmin' && target.id !== req.user.sub) {
      return res.status(403).json({ error: 'Cannot reset superadmin password' })
    }

    const { hashPassword } = await import('../utils/password.js')
    const hash = await hashPassword(req.body.newPassword)
    db.prepare('UPDATE users SET password_hash=?, failed_logins=0, locked_until=NULL WHERE id=?').run(hash, target.id)
    db.prepare('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?').run(target.id)

    audit(db, {
      actorId: req.user.sub, actorUsername: req.user.username,
      action: 'reset_password', targetType: 'user', targetId: String(target.id),
      details: { username: target.username },
      ip: req.ip,
    })
    res.json({ ok: true })
  }
)
