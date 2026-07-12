import { Router } from 'express'
import { Readable } from 'stream'

const router = Router()

router.get('/proxy-image', async (req, res) => {
  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' })
  }

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error' })
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await response.arrayBuffer())

    res.set('Access-Control-Allow-Origin', '*')
    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(buffer)
  } catch {
    res.status(500).json({ error: 'Error al cargar la imagen' })
  }
})

router.get('/proxy-stream', async (req, res) => {
  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' })
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error' })
    }

    res.set('Access-Control-Allow-Origin', '*')
    res.set('Content-Type', response.headers.get('content-type') || 'audio/mpeg')

    Readable.fromWeb(response.body).pipe(res)
  } catch {
    res.status(500).json({ error: 'Error al cargar el stream' })
  }
})

export default router
