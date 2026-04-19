import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { getDb, audit } from '../db/index.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { signAccessToken, generateRefreshToken, hashToken, refreshExpiresAt } from '../utils/jwt.js'
import { verifyAccessToken } from '../utils/jwt.js'
import { authRateLimiter } from '../middleware/rateLimiter.js'

export const authRouter = Router()

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

function issueTokens(db, user, res) {
  const accessToken = signAccessToken({ sub: user.id, username: user.username, role: user.role })
  const rawRefresh = generateRefreshToken()
  const tokenHash = hashToken(rawRefresh)
  const expiresAt = refreshExpiresAt()
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at) VALUES (?,?,?,?)'
  ).run(user.id, tokenHash, expiresAt, Date.now())
  res.cookie('rf_token', rawRefresh, COOKIE_OPTS)
  return accessToken
}

// POST /api/auth/register
authRouter.post('/register',
  authRateLimiter,
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Felhasználónév 3-30 karakter, csak betű/szám/aláhúzás.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Jelszó minimum 8 karakter.'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: errors.array()[0].msg })

    const { username, password } = req.body
    const db = getDb()

    // Block reserved names
    const reserved = ['admin', 'superadmin', 'f3xykee', 'moderator', 'mod', 'system']
    if (reserved.includes(username.toLowerCase())) return res.status(409).json({ error: 'Ez a felhasználónév foglalt.' })

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) return res.status(409).json({ error: 'Ez a felhasználónév már foglalt.' })

    const hash = await hashPassword(password)
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, role, created_at) VALUES (?,?,?,?)'
    ).run(username, hash, 'user', Date.now())

    const user = { id: result.lastInsertRowid, username, role: 'user' }
    audit(db, { actorId: user.id, actorUsername: username, action: 'register', ip: req.ip })
    const accessToken = issueTokens(db, user, res)

    res.status(201).json({ user: { id: user.id, username, role: 'user', can_post: false }, accessToken })
  }
)

// POST /api/auth/login
authRouter.post('/login',
  authRateLimiter,
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Töltsd ki az összes mezőt.' })

    const { username, password } = req.body
    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim())

    // Generic error — don't reveal whether username exists
    const FAIL = () => res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' })

    if (!user) return FAIL()
    if (user.is_banned) {
      if (user.ban_until && user.ban_until > Date.now()) {
        const secsLeft = Math.ceil((user.ban_until - Date.now()) / 1000)
        const label = secsLeft < 3600 ? `${Math.ceil(secsLeft / 60)} perc` : `${Math.ceil(secsLeft / 3600)} óra`
        return res.status(403).json({ error: `Fiók ideiglenesen tiltva. Még kb. ${label}.` })
      }
      if (!user.ban_until) return res.status(403).json({ error: 'Ez a fiók véglegesen el van tiltva.' })
      // ban_until lejárt → automatikus feloldás
      const db = getDb()
      db.prepare('UPDATE users SET is_banned=0, ban_until=NULL WHERE id=?').run(user.id)
    }

    // Lockout check
    if (user.locked_until && user.locked_until > Date.now()) {
      const secsLeft = Math.ceil((user.locked_until - Date.now()) / 1000)
      const label = secsLeft < 60 ? `${secsLeft} másodperc` : `${Math.ceil(secsLeft / 60)} perc`
      return res.status(429).json({ error: `Fiók zárolva 5 hibás kísérlet miatt. Próbáld ${label} múlva.` })
    }

    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) {
      const fails = (user.failed_logins || 0) + 1
      const lockUntil = fails >= 5 ? Date.now() + 5 * 60 * 1000 : null
      db.prepare('UPDATE users SET failed_logins=?, locked_until=? WHERE id=?').run(fails, lockUntil, user.id)
      audit(db, {
        actorId: user.id, actorUsername: user.username, action: 'login_fail',
        details: { attempt: fails, locked: !!lockUntil }, ip: req.ip,
      })
      return FAIL()
    }

    // Reset failed logins, update last_login
    db.prepare('UPDATE users SET failed_logins=0, locked_until=NULL, last_login=? WHERE id=?').run(Date.now(), user.id)
    audit(db, { actorId: user.id, actorUsername: user.username, action: 'login', ip: req.ip })
    const accessToken = issueTokens(db, user, res)

    const dbUser = db.prepare('SELECT can_post FROM users WHERE id=?').get(user.id)
    res.json({ user: { id: user.id, username: user.username, role: user.role, can_post: !!dbUser?.can_post }, accessToken })
  }
)

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  const raw = req.cookies?.rf_token
  if (raw) {
    const db = getDb()
    db.prepare('UPDATE refresh_tokens SET revoked=1 WHERE token_hash=?').run(hashToken(raw))
    const payload = (() => { try { return verifyAccessToken(req.headers.authorization?.slice(7) || '') } catch { return null } })()
    if (payload) audit(db, { actorId: payload.sub, actorUsername: payload.username, action: 'logout', ip: req.ip })
  }
  res.clearCookie('rf_token', { ...COOKIE_OPTS, maxAge: 0 })
  res.json({ ok: true })
})

// POST /api/auth/refresh
authRouter.post('/refresh', (req, res) => {
  const raw = req.cookies?.rf_token
  if (!raw) return res.status(401).json({ error: 'No refresh token' })

  const db = getDb()
  const tokenHash = hashToken(raw)
  const row = db.prepare(
    'SELECT rt.*, u.username, u.role, u.is_banned FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id WHERE rt.token_hash=?'
  ).get(tokenHash)

  if (!row || row.revoked || row.expires_at < Date.now()) {
    res.clearCookie('rf_token', { ...COOKIE_OPTS, maxAge: 0 })
    return res.status(401).json({ error: 'Invalid refresh token' })
  }
  if (row.is_banned) return res.status(403).json({ error: 'Account banned' })

  // Rotate refresh token (single-use)
  db.prepare('UPDATE refresh_tokens SET revoked=1 WHERE id=?').run(row.id)
  const user = { id: row.user_id, username: row.username, role: row.role }
  const accessToken = issueTokens(db, user, res)
  const fullUser = db.prepare('SELECT can_post FROM users WHERE id=?').get(user.id)
  res.json({ accessToken, user: { id: user.id, username: user.username, role: user.role, can_post: !!fullUser?.can_post } })
})

// GET /api/auth/me
authRouter.get('/me', (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const payload = verifyAccessToken(header.slice(7))
    const db = getDb()
    const row = db.prepare('SELECT id, username, role, is_banned, can_post FROM users WHERE id=?').get(payload.sub)
    if (!row || row.is_banned) return res.status(403).json({ error: 'Account unavailable' })
    res.json({ user: { id: row.id, username: row.username, role: row.role, can_post: !!row.can_post } })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})
