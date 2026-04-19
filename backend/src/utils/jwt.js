import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import 'dotenv/config'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m'
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES, algorithm: 'HS256' })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'] })
}

export function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex')
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export function refreshExpiresAt() {
  return Date.now() + REFRESH_EXPIRES_MS
}
