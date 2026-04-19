import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { requireAdmin } from '../middleware/auth.js'

export const uploadRouter = Router()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../data/uploads')

const ALLOWED_MIME = new Set([
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
])

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
    cb(null, unique)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true)
    cb(new Error('Nem engedélyezett fájltípus'))
  },
})

// POST /api/upload — admin only, single file
uploadRouter.post('/', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nincs fájl' })
  const url = `/uploads/${req.file.filename}`
  res.json({ url, filename: req.file.filename, mimetype: req.file.mimetype, size: req.file.size })
})
