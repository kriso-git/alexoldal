import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getDb, audit } from '../db/index.js'
import { requireSuperadmin } from '../middleware/auth.js'

export const songsRouter = Router()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MUSIC_DIR = process.env.UPLOADS_DIR
  ? path.join(process.env.UPLOADS_DIR, 'music')
  : path.join(__dirname, '../../data/uploads/music')
fs.mkdirSync(MUSIC_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: MUSIC_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
    cb(null, unique)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const ok = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/flac'].includes(file.mimetype)
    ok ? cb(null, true) : cb(new Error('Csak hangfájl engedélyezett'))
  },
})

// GET /api/songs — public
songsRouter.get('/', (req, res) => {
  const db = getDb()
  const songs = db.prepare('SELECT id, name, filename, created_at FROM songs ORDER BY created_at ASC').all()
  res.json(songs.map(s => ({ ...s, url: `/uploads/music/${s.filename}` })))
})

// POST /api/superadmin/songs — superadmin only
songsRouter.post('/upload', requireSuperadmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nincs fájl' })
  const db = getDb()
  const name = req.body.name?.trim() || req.file.originalname.replace(/\.[^.]+$/, '')
  const result = db.prepare('INSERT INTO songs (name, filename, created_at) VALUES (?,?,?)').run(name, req.file.filename, Date.now())
  audit(db, { actorId: req.user.sub, actorUsername: req.user.username, action: 'upload_song', targetId: String(result.lastInsertRowid), details: { name }, ip: req.ip })
  res.status(201).json({ id: result.lastInsertRowid, name, url: `/uploads/music/${req.file.filename}` })
})

// DELETE /api/superadmin/songs/:id — superadmin only
songsRouter.delete('/:id', requireSuperadmin, (req, res) => {
  const db = getDb()
  const song = db.prepare('SELECT * FROM songs WHERE id=?').get(req.params.id)
  if (!song) return res.status(404).json({ error: 'Nem található' })
  try { fs.unlinkSync(path.join(MUSIC_DIR, song.filename)) } catch {}
  db.prepare('DELETE FROM songs WHERE id=?').run(req.params.id)
  audit(db, { actorId: req.user.sub, actorUsername: req.user.username, action: 'delete_song', targetId: String(song.id), details: { name: song.name }, ip: req.ip })
  res.status(204).end()
})
