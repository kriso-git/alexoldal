import { Router } from 'express'
import { getDb } from '../db/index.js'

export const visitsRouter = Router()

// POST /api/visit — increment and return count
visitsRouter.post('/', (req, res) => {
  const db = getDb()
  db.prepare("UPDATE settings SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT) WHERE key='visit_count'").run()
  const row = db.prepare("SELECT value FROM settings WHERE key='visit_count'").get()
  res.json({ count: parseInt(row.value) })
})

// GET /api/visit — just read current count
visitsRouter.get('/', (req, res) => {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key='visit_count'").get()
  res.json({ count: parseInt(row?.value || '0') })
})
