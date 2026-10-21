import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { register, login, me } from '../controllers/authController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

const router = Router()

// Límite configurable por entorno, mismo patrón que PROXY_TIMEOUT_MS: en
// producción (sin la variable) se mantiene en 10 intentos cada 15 minutos.
const AUTH_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT) || 10

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: AUTH_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' },
})

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.get('/me', authMiddleware, me)

export default router