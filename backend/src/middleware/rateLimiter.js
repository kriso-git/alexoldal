import rateLimit from 'express-rate-limit'

// Tight limit for auth endpoints (login, register)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Túl sok kísérlet. Próbáld újra 15 perc múlva.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
})

// Looser limit for general API
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Túl sok kérés. Lassíts egy kicsit.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Very tight for password-sensitive operations
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Túl sok kísérlet. Próbáld újra 1 óra múlva.' },
  standardHeaders: true,
  legacyHeaders: false,
})
