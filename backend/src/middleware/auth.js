import { verifyAccessToken } from '../utils/jwt.js'
import { getDb } from '../db/index.js'

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next()
  try {
    const payload = verifyAccessToken(header.slice(7))
    req.user = payload
  } catch {}
  next()
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  try {
    req.user = verifyAccessToken(header.slice(7))
    const db = getDb()
    const row = db.prepare('SELECT is_banned FROM users WHERE id = ?').get(req.user.sub)
    if (!row || row.is_banned) return res.status(403).json({ error: 'Account banned or deleted' })
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') return next()
    return res.status(403).json({ error: 'Admin access required' })
  })
}

// Allows admin, superadmin, and users with can_post permission
export function requireCanPost(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') return next()
    const db = getDb()
    const row = db.prepare('SELECT can_post FROM users WHERE id=?').get(req.user.sub)
    if (row?.can_post) return next()
    return res.status(403).json({ error: 'Nincs jogosultság posztoláshoz' })
  })
}

export function requireSuperadmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Superadmin access required' })
    }
    next()
  })
}
