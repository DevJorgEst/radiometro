import express from 'express'
import cors from 'cors'
import radioRoutes from './routes/radio.routes.js'
import authRoutes from './routes/auth.routes.js'
import favoritesRoutes from './routes/favorites.routes.js'
import proxyRoutes from './routes/proxy.routes.js'

const app = express()

const allowedOrigins = [
  'https://radiometro.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
]

const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL)
}
allowedOrigins.push(...envOrigins)

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else if (process.env.FRONTEND_URL) {
      callback(null, true)
    } else {
      callback(new Error('Origen no permitido por CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.options('/{*splat}', cors(corsOptions))
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ mensaje: 'Hola Mundo' })
})

app.use('/api', radioRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/favorites', favoritesRoutes)
app.use('/api', proxyRoutes)

export default app
