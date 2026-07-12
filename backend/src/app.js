import express from 'express'
import cors from 'cors'
import radioRoutes from './routes/radio.routes.js'
import authRoutes from './routes/auth.routes.js'
import favoritesRoutes from './routes/favorites.routes.js'
import proxyRoutes from './routes/proxy.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ mensaje: 'Hola Mundo' })
})

app.use('/api', radioRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/favorites', favoritesRoutes)
app.use('/api', proxyRoutes)

export default app
