import { verifyAccessToken } from '../utils/jwt.js'
import { getDb } from '../db/index.js'

// Attach user to req.user if valid token; does NOT reject (use requireAuth for that)
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next()
  try {
    const payload = verifyAccessToken(header.slice(7))
    req.user = payload
  } catch {}
  next()
}

// Requires valid JWT
export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  try {
    req.user = verifyAccessToken(header.slice(7))
    // Check ban status from DB (defense-in-depth: token could be valid but user was banned)
    const db = getDb()
    const row = db.prepare('SELECT is_banned FROM users WHERE id = ?').get(req.user.sub)
    if (!row || row.is_banned) return res.status(403).json({ error: 'Account banned or deleted' })
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Requires admin or superadmin role
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  })
}

// Requires superadmin role only
export function requireSuperadmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Superadmin access required' })
    }
    next()
  })
}
