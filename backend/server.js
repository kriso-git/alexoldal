import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import { authRouter } from './src/routes/auth.js'
import { postsRouter } from './src/routes/posts.js'
import { commentsRouter } from './src/routes/comments.js'
import { superadminRouter } from './src/routes/superadmin.js'
import { uploadRouter } from './src/routes/upload.js'
import { songsRouter } from './src/routes/songs.js'
import { visitsRouter } from './src/routes/visits.js'
import { apiRateLimiter } from './src/middleware/rateLimiter.js'
import { initDb } from './src/db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      mediaSrc: ["'self'", 'https:', 'blob:'],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", 'https://www.youtube.com'],
      objectSrc: ["'none'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.disable('x-powered-by')

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim())
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('CORS: origin not allowed'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '64kb' }))
app.use(cookieParser())

// ── Serve uploaded files ──────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'data/uploads')
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }))

// ── CSRF mitigation on refresh ────────────────────────────────────────────────
app.use('/api/auth/refresh', (req, res, next) => {
  if (req.method === 'POST' && !req.headers['x-requested-with']) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
})

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', apiRateLimiter)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api', postsRouter)
app.use('/api', commentsRouter)
app.use('/api/superadmin', superadminRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/songs', songsRouter)
app.use('/api/superadmin/songs', songsRouter)
app.use('/api/visit', visitsRouter)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }))

// ── Serve built frontend in production ────────────────────────────────────────
if (isProd) {
  const distDir = path.join(__dirname, '../dist')
  app.use(express.static(distDir, { maxAge: '1d', etag: true }))
  app.get(/^(?!\/api|\/uploads).*/, (_, res) => res.sendFile(path.join(distDir, 'index.html')))
}

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const message = isProd && err.status !== 422 ? 'Internal server error' : (err.message || 'Error')
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)
  res.status(err.status || 500).json({ error: message })
})

// ── Boot ──────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await initDb()
    app.listen(PORT, () => {
      console.log(`[F3xykee backend] Listening on :${PORT} (${process.env.NODE_ENV || 'development'})`)
    })
  } catch (err) {
    console.error('[FATAL] Failed to start:', err)
    process.exit(1)
  }
}

start()
