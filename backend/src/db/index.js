import Database from 'better-sqlite3'
import { SCHEMA_SQL } from './schema.js'
import { hashPassword } from '../utils/password.js'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(__dirname, '../../', process.env.DB_PATH || './data/f3xykee.db')

import fs from 'fs'

let _db = null

export function getDb() {
  if (!_db) throw new Error('DB not initialized. Call initDb() first.')
  return _db
}

export async function initDb() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  _db = new Database(dbPath)
  _db.exec(SCHEMA_SQL)

  // Ensure superadmin account exists
  const { SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD } = process.env
  if (SUPERADMIN_USERNAME && SUPERADMIN_PASSWORD) {
    const existing = _db.prepare('SELECT id, role FROM users WHERE username = ?').get(SUPERADMIN_USERNAME)
    if (!existing) {
      const hash = await hashPassword(SUPERADMIN_PASSWORD)
      _db.prepare(
        'INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)'
      ).run(SUPERADMIN_USERNAME, hash, 'superadmin', Date.now())
      console.log(`[DB] Superadmin account created: @${SUPERADMIN_USERNAME}`)
    } else if (existing.role !== 'superadmin') {
      _db.prepare("UPDATE users SET role='superadmin' WHERE username=?").run(SUPERADMIN_USERNAME)
      console.log(`[DB] Upgraded @${SUPERADMIN_USERNAME} to superadmin`)
    }
  }

  // Migrate: add ban_until column to users if missing
  try { _db.exec("ALTER TABLE users ADD COLUMN ban_until INTEGER") } catch {}

  // Initialize post order + visit count if missing
  const order = _db.prepare("SELECT value FROM settings WHERE key='post_order'").get()
  if (!order) _db.prepare("INSERT INTO settings (key, value) VALUES ('post_order', '[]')").run()
  const visits = _db.prepare("SELECT value FROM settings WHERE key='visit_count'").get()
  if (!visits) _db.prepare("INSERT INTO settings (key, value) VALUES ('visit_count', '0')").run()

  // Purge expired refresh tokens (housekeeping)
  _db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ? OR revoked = 1').run(Date.now())

  console.log(`[DB] Ready: ${dbPath}`)
  return _db
}

// Helper: audit log writer
export function audit(db, { actorId, actorUsername, action, targetType, targetId, details, ip }) {
  db.prepare(
    'INSERT INTO audit_log (actor_id, actor_username, action, target_type, target_id, details, ip, created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run(actorId ?? null, actorUsername ?? null, action, targetType ?? null, targetId ?? null,
    details ? JSON.stringify(details) : null, ip ?? null, Date.now())
}
