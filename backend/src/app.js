import express from 'express'
import cors from 'cors'
import radioRoutes from './routes/radio.routes.js'
import authRoutes from './routes/auth.routes.js'
import favoritesRoutes from './routes/favorites.routes.js'
import proxyRoutes from './routes/proxy.routes.js'

const app = express()

// Render (y cualquier PaaS) pone un proxy delante: sin esto req.ip es el del
// proxy y el rate limit de auth acaba compartido por todos los usuarios.
// Desactivado por defecto para que un despliegue directo no acepte
// X-Forwarded-For falsificado.
const trustProxyHops = Number(process.env.TRUST_PROXY)
if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops)

// Orígenes permitidos: defaults de desarrollo + CORS_ORIGINS (coma) + FRONTEND_URL.
// Nunca se acepta un origen fuera de esta lista (sin bypass condicionado a env).
const DEV_DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
]

const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const frontendOrigin = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim() : ''

const allowedOrigins = [
  ...new Set([
    ...DEV_DEFAULT_ORIGINS,
    ...(frontendOrigin ? [frontendOrigin] : []),
    ...envOrigins,
  ]),
]

// Bearer token en localStorage -> no se usan cookies, credentials queda fuera.
const corsOptions = {
  origin(origin, callback) {
    // Peticiones sin Origin (curl, server-to-server) no están sujetas a CORS.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    // Origen no permitido: se omite la cabecera (403 lógico en el navegador)
    // en vez de lanzar un Error que convertiría la petición en un 500 con stack.
    callback(null, false)
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ mensaje: 'Hola Mundo' })
})

app.use('/api', radioRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/favorites', favoritesRoutes)
app.use('/api', proxyRoutes)

export default app
