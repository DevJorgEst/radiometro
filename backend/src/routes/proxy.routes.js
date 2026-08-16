import { Router } from 'express'
import { Readable } from 'stream'
import { isBlockedByDns } from '../utils/urlSecurity.js'

const router = Router()

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const TIMEOUT_MS = 10000

function fetchWithRedirects(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const visit = async (currentUrl, redirectsLeft) => {
      if (await isBlockedByDns(currentUrl)) {
        return reject(new Error('URL no permitida'))
      }

      let response
      try {
        response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      } catch (err) {
        return reject(err)
      }

      if ([301, 302, 303, 307, 308].includes(response.status) && redirectsLeft > 0) {
        const location = response.headers.get('location')
        if (location) {
          await response.body?.cancel()
          const nextUrl = new URL(location, currentUrl).toString()
          return visit(nextUrl, redirectsLeft - 1)
        }
      }

      resolve(response)
    }

    visit(url, maxRedirects).catch(reject)
  })
}

router.get('/proxy-image', async (req, res) => {
  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' })
  }

  try {
    const response = await fetchWithRedirects(url)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error' })
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await response.arrayBuffer())

    if (buffer.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Imagen demasiado grande' })
    }

    res.set('Access-Control-Allow-Origin', '*')
    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(buffer)
  } catch (err) {
    res.status(400).json({ error: err.message === 'URL no permitida' ? err.message : 'Error al cargar la imagen' })
  }
})

router.get('/proxy-stream', async (req, res) => {
  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' })
  }

  try {
    const response = await fetchWithRedirects(url)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error' })
    }

    res.set('Access-Control-Allow-Origin', '*')
    res.set('Content-Type', response.headers.get('content-type') || 'audio/mpeg')

    Readable.fromWeb(response.body).pipe(res)
  } catch (err) {
    if (!res.headersSent) {
      res.status(400).json({ error: err.message === 'URL no permitida' ? err.message : 'Error al cargar el stream' })
    } else {
      res.destroy()
    }
  }
})

export default router