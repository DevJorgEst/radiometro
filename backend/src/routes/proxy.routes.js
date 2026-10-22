import { Router } from 'express'
import { Readable } from 'stream'
import { isBlockedByDns } from '../utils/urlSecurity.js'
import { safeAgent, isBlockedByConnector } from '../utils/safeFetch.js'

const router = Router()

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
// Solo imágenes raster. El SVG ejecuta <script> al abrirse directamente y se
// serviría desde nuestro origen: sería XSS. Sin SVG, el favicon roto cae al
// logo de respaldo que ya pinta el cliente.
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
])
// Timeout de conexión en ms (solo cabeceras en proxy-stream).
// Configurable con PROXY_TIMEOUT_MS para que los tests no tarden 10 s.
const TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS) || 10000
// User-Agent de navegador: CDNs de favicons bloquean el UA por defecto de
// fetch ("undici"), lo que provocaba 404 upstream innecesarios.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function fetchWithRedirects(url, { maxRedirects = 3, signal } = {}) {
  return new Promise((resolve, reject) => {
    const visit = async (currentUrl, redirectsLeft) => {
      if (await isBlockedByDns(currentUrl)) {
        return reject(new Error('URL no permitida'))
      }

      let response
      try {
        response = await fetch(currentUrl, {
          redirect: 'manual',
          headers: { 'User-Agent': USER_AGENT },
          signal,
          // El conector resuelve y filtra: la IP validada es la que se usa.
          dispatcher: safeAgent,
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
  // 400 = fallo de validación/SSRF (no se intenta contacto con el origen)
  if (!url || typeof url !== 'string' || url === 'null') {
    return res.status(400).json({ error: 'url es requerida' })
  }

  try {
    // Para imágenes el timeout cubre la petición completa (se bufferea entera)
    const response = await fetchWithRedirects(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) {
      // El upstream respondió: si falla (5xx) -> 502 Bad Gateway;
      // si el recurso no existe (404 etc.) se reenvía el estado real.
      await response.body?.cancel()
      if (response.status >= 500) {
        return res.status(502).json({ error: 'El servidor de origen falló' })
      }
      return res.status(response.status).json({ error: 'El recurso no está disponible en el origen' })
    }

    if (!response.body) {
      return res.status(502).json({ error: 'El origen no devolvió contenido' })
    }

    // Tipo declarado por el origen, sin parámetros. Se comprueba antes de
    // leer: un proxy abierto a HTML/JS en este dominio sería XSS reflejado.
    const contentType = (response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase()

    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      await response.body.cancel()
      return res.status(415).json({ error: 'El recurso no es una imagen' })
    }

    // Si el origen declara el tamaño, se rechaza sin descargar nada.
    const declared = Number(response.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
      await response.body.cancel()
      return res.status(413).json({ error: 'Imagen demasiado grande' })
    }

    // El tope se aplica mientras se lee: `arrayBuffer()` bufferizaba primero
    // y comprobaba después, así que una respuesta de varios GB tumbaba el
    // proceso por OOM antes de llegar al 413.
    const chunks = []
    let total = 0
    for await (const chunk of response.body) {
      total += chunk.length
      if (total > MAX_IMAGE_BYTES) {
        return res.status(413).json({ error: 'Imagen demasiado grande' })
      }
      chunks.push(chunk)
    }

    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'public, max-age=86400')
    res.set('X-Content-Type-Options', 'nosniff')
    res.send(Buffer.concat(chunks))
  } catch (err) {
    if (isBlockedByConnector(err)) {
      // Validación/SSRF -> 400
      return res.status(400).json({ error: 'URL no permitida' })
    }
    // Timeout, DNS, conexión rechazada... -> 502
    return res.status(502).json({ error: 'No se pudo cargar la imagen de origen' })
  }
})

router.get('/proxy-stream', async (req, res) => {
  const { url } = req.query
  if (!url || typeof url !== 'string' || url === 'null') {
    return res.status(400).json({ error: 'url es requerida' })
  }

  // El timeout solo cubre la conexión inicial (cabeceras): el cuerpo de un
  // stream de audio dura horas. Antes usábamos AbortSignal.timeout sobre el
  // body completo: a los 10 s la transmisión se abortaba y su TimeoutError,
  // emitido en el Readable sin listener, tumbaba el proceso entero
  // (unhandled 'error' event -> backend caído hasta reiniciarlo a mano).
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('Timeout de conexión', 'TimeoutError')),
    TIMEOUT_MS,
  )

  try {
    const response = await fetchWithRedirects(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!response.ok) {
      await response.body?.cancel()
      if (response.status >= 500) {
        return res.status(502).json({ error: 'El servidor de origen falló' })
      }
      return res.status(response.status).json({ error: 'El recurso no está disponible en el origen' })
    }

    const upstreamType = response.headers.get('content-type') || ''
    // El navegador ejecuta HTML/SVG al navegar a esta URL: no se reenvían.
    if (/^(text\/html|application\/xhtml\+xml|image\/svg\+xml)/i.test(upstreamType)) {
      await response.body?.cancel()
      return res.status(415).json({ error: 'El origen no es un stream de audio' })
    }

    res.set('Content-Type', upstreamType || 'audio/mpeg')
    res.set('X-Content-Type-Options', 'nosniff')

    const stream = Readable.fromWeb(response.body)
    // Error del origen en mitad del stream (timeout, corte de red): cerrar la
    // respuesta. Sin este listener el 'error' era sin handler y mataba Node.
    stream.on('error', () => {
      if (res.headersSent) {
        res.destroy()
      } else if (!res.writableEnded) {
        res.status(502).json({ error: 'El stream de origen se interrumpió' })
      }
    })
    // Cliente desconectado (pausa/cambio de emisora): cerrar el stream de origen.
    res.on('close', () => stream.destroy())
    stream.pipe(res)
  } catch (err) {
    clearTimeout(timer)
    if (!res.headersSent) {
      if (isBlockedByConnector(err)) {
        res.status(400).json({ error: 'URL no permitida' })
      } else {
        res.status(502).json({ error: 'No se pudo cargar el stream de origen' })
      }
    } else {
      res.destroy()
    }
  }
})

export default router
