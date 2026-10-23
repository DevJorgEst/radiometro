import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'test-secret'
// Timeout de proxy corto: los tests de stream verifican que el stream sobrevive
// al timeout de conexión sin esperar los 10 s de producción.
process.env.PROXY_TIMEOUT_MS = '250'

const { default: app } = await import('../src/app.js')
const { closeDb } = await import('../src/config/db.js')
const { isBlockedUrl, isBlockedByDns } = await import('../src/utils/urlSecurity.js')
const { safeLookup, isBlockedByConnector } = await import('../src/utils/safeFetch.js')

let server
let baseUrl

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`
      resolve()
    })
  })
})

after(async () => {
  // Cierre forzoso: si un test deja una respuesta de stream abierta,
  // server.close() esperaría esa conexión activa indefinidamente.
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  await closeDb()
})

async function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

test('proxy-image rechaza URL sin esquema http/https', async () => {
  const res = await fetch(`${baseUrl}/api/proxy-image?url=ftp://example.com/x.png`)
  assert.equal(res.status, 400)
})

test('proxy-image rechaza IP privada (SSRF)', async () => {
  const res = await fetch(`${baseUrl}/api/proxy-image?url=http://127.0.0.1:5000/x.png`)
  assert.equal(res.status, 400)
})

test('proxy-image rechaza localhost por nombre', async () => {
  const res = await fetch(`${baseUrl}/api/proxy-image?url=http://localhost:5000/x.png`)
  assert.equal(res.status, 400)
})

test('proxy-image sin url devuelve 400', async () => {
  const res = await fetch(`${baseUrl}/api/proxy-image`)
  assert.equal(res.status, 400)
})

test('proxy-image rechaza contenido que no es imagen (415)', async (t) => {
  const realFetch = globalThis.fetch.bind(globalThis)
  t.mock.method(globalThis, 'fetch', (input, init) => {
    if (String(input).startsWith('http://')) return realFetch(input, init)
    return Promise.resolve(
      new Response('<html><script>alert(1)</script></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )
  })

  const res = await realFetch(`${baseUrl}/api/proxy-image?url=https://93.184.215.14/favicon.html`)
  assert.equal(res.status, 415)
})

test('proxy-image rechaza sin descargar si el origen declara un tamaño excesivo (413)', async (t) => {
  const realFetch = globalThis.fetch.bind(globalThis)
  t.mock.method(globalThis, 'fetch', (input, init) => {
    if (String(input).startsWith('http://')) return realFetch(input, init)
    return Promise.resolve(
      new Response(new Uint8Array(10), {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-length': String(6 * 1024 * 1024),
        },
      }),
    )
  })

  const res = await realFetch(`${baseUrl}/api/proxy-image?url=https://93.184.215.14/huge.png`)
  assert.equal(res.status, 413)
})

test('proxy-image corta el cuerpo que miente sobre su tamaño (413, sin OOM)', async (t) => {
  const realFetch = globalThis.fetch.bind(globalThis)
  const chunk = new Uint8Array(64 * 1024)
  const body = new ReadableStream({
    start(controller) {
      // 81 × 64 KB > 5 MB y sin content-length: el tope debe cortar al leer.
      for (let i = 0; i < 81; i++) controller.enqueue(chunk)
      controller.close()
    },
  })
  t.mock.method(globalThis, 'fetch', (input, init) => {
    if (String(input).startsWith('http://')) return realFetch(input, init)
    return Promise.resolve(
      new Response(body, { status: 200, headers: { 'content-type': 'image/png' } }),
    )
  })

  const res = await realFetch(`${baseUrl}/api/proxy-image?url=https://93.184.215.14/big.png`)
  assert.equal(res.status, 413)
})

// El conector es la comprobación autoritativa: aunque la validación previa
// pase, la IP a la que se conecta se filtra aquí (mata el DNS rebinding).
test('proxy-image entrega la imagen validada con nosniff', async (t) => {
  const realFetch = globalThis.fetch.bind(globalThis)
  const png = new Uint8Array([137, 80, 78, 71])
  t.mock.method(globalThis, 'fetch', (input, init) => {
    if (String(input).startsWith('http://')) return realFetch(input, init)
    return Promise.resolve(
      new Response(png, { status: 200, headers: { 'content-type': 'image/png' } }),
    )
  })

  const res = await realFetch(`${baseUrl}/api/proxy-image?url=https://93.184.215.14/logo.png`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'image/png')
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  assert.equal((await res.arrayBuffer()).byteLength, 4)
})

test('proxy-stream rechaza HTML del origen (415, no XSS en el dominio de la API)', async (t) => {
  const realFetch = globalThis.fetch.bind(globalThis)
  t.mock.method(globalThis, 'fetch', (input, init) => {
    if (String(input).startsWith('http://')) return realFetch(input, init)
    return Promise.resolve(
      new Response('<html>no soy audio</html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )
  })

  const res = await realFetch(`${baseUrl}/api/proxy-stream?url=https://93.184.215.14/notaudio`)
  assert.equal(res.status, 415)
})

test('safeLookup bloquea una IP privada', (_t, done) => {
  safeLookup('127.0.0.1', { all: true }, (err, addresses) => {
    assert.ok(err instanceof Error)
    assert.equal(err.message, 'URL no permitida')
    assert.equal(addresses, undefined)
    done()
  })
})

test('safeLookup devuelve la IP pública validada', (_t, done) => {
  safeLookup('93.184.215.14', { all: true }, (err, addresses) => {
    assert.equal(err, null)
    assert.deepEqual(addresses, [{ address: '93.184.215.14', family: 4 }])
    done()
  })
})

test('isBlockedByConnector reconoce el error envuelto por fetch', () => {
  const wrapped = new TypeError('fetch failed', { cause: new Error('URL no permitida') })
  assert.equal(isBlockedByConnector(wrapped), true)
  assert.equal(isBlockedByConnector(new Error('otra cosa')), false)
})

test('proxy-stream rechaza IP privada (SSRF)', async () => {
  const res = await fetch(`${baseUrl}/api/proxy-stream?url=http://192.168.1.1:8000/stream`)
  assert.equal(res.status, 400)
})

test('rate limit devuelve 429 tras exceder intentos', async () => {
  let status
  for (let i = 0; i < 12; i++) {
    const res = await post('/api/auth/login', { username: 'ghost', password: 'password123' })
    status = res.status
  }
  assert.equal(status, 429)
})

test('isBlockedUrl bloquea literales IPv6 privados (SSRF por IPv6)', () => {
  const privados = [
    'http://[::1]/x.png', // loopback
    'http://[::]/x.png', // unspecified
    'http://[fc00::1]/x.png', // ULA
    'http://[fd12:3456:789a::1]/x.png', // ULA
    'http://[fe80::1]/x.png', // link-local
    'http://[ff02::1]/x.png', // multicast
    'http://[::ffff:127.0.0.1]/x.png', // IPv4-mapped (notación punteada)
    'http://[::ffff:7f00:1]/x.png', // IPv4-mapped (notación hexadecimal)
    'http://[::ffff:c0a8:1]/x.png', // IPv4-mapped 192.168.0.1
  ]
  for (const url of privados) {
    assert.equal(isBlockedUrl(url), true, `debería bloquear ${url}`)
  }
})

test('isBlockedUrl permite literales IPv6 públicos (servidores IPv6-only)', () => {
  const publicos = [
    'http://[2a01:4f8:251:2fde::2]/logo.png',
    'https://[2001:4860:4860::8888]/logo.png',
  ]
  for (const url of publicos) {
    assert.equal(isBlockedUrl(url), false, `debería permitir ${url}`)
  }
})

test('proxy-image rechaza IPv6 privado literal (SSRF)', async () => {
  const url = encodeURIComponent('http://[fd00::1]/x.png')
  const res = await fetch(`${baseUrl}/api/proxy-image?url=${url}`)
  assert.equal(res.status, 400)
})

test('isBlockedByDns no bloquea dominios públicos sin registro A (IPv6-only)', async (t) => {
  const { resolve4, resolve6 } = await import('node:dns/promises')
  const [a, aaaa] = await Promise.allSettled([
    resolve4('www.0nradio.com'),
    resolve6('www.0nradio.com'),
  ])
  if (a.status === 'rejected' && aaaa.status === 'rejected') {
    t.skip('sin acceso a DNS en este entorno')
    return
  }
  // Regresión del bug: con solo resolve4, un dominio IPv6-only (solo AAAA
  // público) caía en el catch y se bloqueaba como si fuera SSRF -> 400
  // a un recurso público legítimo.
  assert.equal(await isBlockedByDns('https://www.0nradio.com/logos/x.jpg'), false)
})

test('proxy-stream sigue transmitiendo tras el timeout de conexión (regresión: crasheaba el proceso)', async (t) => {
  const realFetch = globalThis.fetch.bind(globalThis)
  let emitted = 0
  const upstreamBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1]))
      // El "origen" sigue emitiendo mucho más allá del timeout (radio en vivo)
      const iv = setInterval(() => {
        emitted++
        controller.enqueue(new Uint8Array([emitted]))
        if (emitted >= 4) {
          clearInterval(iv)
          controller.close()
        }
      }, 150) // 4 × 150 ms = ~600 ms > 250 ms de timeout
    },
  })
  t.mock.method(globalThis, 'fetch', (input, init) => {
    const url = String(input)
    // La petición del propio test al servidor local pasa; el upstream se simula
    if (url.startsWith('http://')) return realFetch(input, init)
    return Promise.resolve(
      new Response(upstreamBody, { status: 200, headers: { 'content-type': 'audio/mpeg' } }),
    )
  })

  const started = Date.now()
  const res = await realFetch(`${baseUrl}/api/proxy-stream?url=https://93.184.215.14/stream.mp3`)
  assert.equal(res.status, 200)

  const reader = res.body.getReader()
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.length
  }
  const elapsed = Date.now() - started

  assert.ok(received > 1, `el stream se cortó: recibidos ${received} bytes`)
  assert.ok(elapsed >= 500, `el stream terminó demasiado pronto (${elapsed} ms): el timeout lo abortó`)
})

test('proxy-stream devuelve 502 si el origen no manda cabeceras antes del timeout', async (t) => {
  const realFetch = globalThis.fetch.bind(globalThis)
  t.mock.method(globalThis, 'fetch', (input, init) => {
    const url = String(input)
    if (url.startsWith('http://')) return realFetch(input, init)
    // El "origen" nunca responde: solo debe abortarlo el timeout de conexión
    return new Promise((_, reject) => {
      const onAbort = () => reject(new DOMException('Timeout de conexión', 'TimeoutError'))
      if (init?.signal?.aborted) onAbort()
      else init?.signal?.addEventListener('abort', onAbort, { once: true })
    })
  })

  const res = await realFetch(`${baseUrl}/api/proxy-stream?url=https://93.184.215.14/slow.mp3`)
  assert.equal(res.status, 502)
})

test('proxy-stream cierra la respuesta si el origen muere en mitad del stream (sin crasar)', async (t) => {
  const realFetch = globalThis.fetch.bind(globalThis)
  let upstreamController
  const upstreamBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]))
      upstreamController = controller
    },
  })
  t.mock.method(globalThis, 'fetch', (input, init) => {
    const url = String(input)
    if (url.startsWith('http://')) return realFetch(input, init)
    return Promise.resolve(
      new Response(upstreamBody, { status: 200, headers: { 'content-type': 'audio/mpeg' } }),
    )
  })

  const res = await realFetch(`${baseUrl}/api/proxy-stream?url=https://93.184.215.14/dies.mp3`)
  assert.equal(res.status, 200)

  const reader = res.body.getReader()
  const first = await reader.read()
  assert.ok(first.value.length > 0)

  // El origen se cae en mitad de la transmisión: antes, su 'error' emitido en
  // el Readable sin listener tumbaba el proceso entero.
  upstreamController.error(new Error('upstream murió'))
  await assert.rejects(() => reader.read())
})
