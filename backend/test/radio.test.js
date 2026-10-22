import { test, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'test-secret'

const { default: app } = await import('../src/app.js')

const realFetch = globalThis.fetch
let server
let baseUrl
let requestedUrl

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`
      resolve()
    })
  })
})

after(async () => {
  globalThis.fetch = realFetch
  await new Promise((resolve) => server.close(resolve))
})

beforeEach(() => {
  requestedUrl = undefined
})

afterEach(() => {
  globalThis.fetch = realFetch
})

// El controlador habla con Radio Browser por `fetch` global: se sustituye solo
// para la llamada saliente y el cliente del test usa el fetch real.
function mockCatalog(payload) {
  globalThis.fetch = async (url) => {
    requestedUrl = String(url)
    return { ok: true, json: async () => payload }
  }
}

function station(n) {
  return {
    stationuuid: `id-${n}`,
    name: ` Emisora ${n} `,
    url_resolved: `http://example.com/${n}`,
    country: 'Spain',
    language: 'spanish',
    tags: 'pop',
    favicon: '',
    votes: n,
  }
}

function get(path) {
  return realFetch(`${baseUrl}${path}`)
}

test('la búsqueda pide un resultado de más y recorta al límite', async () => {
  mockCatalog(Array.from({ length: 31 }, (_, i) => station(i + 1)))

  const res = await get('/api/stations/search')
  assert.equal(res.status, 200)

  const body = await res.json()
  assert.equal(body.items.length, 30)
  assert.equal(body.items[0].name, 'Emisora 1')
  assert.equal(body.hasMore, true)

  const params = new URL(requestedUrl).searchParams
  assert.equal(params.get('limit'), '31')
  assert.equal(params.get('offset'), '0')
})

test('offset llega al catálogo y sin resultados extra hasMore es false', async () => {
  mockCatalog(Array.from({ length: 5 }, (_, i) => station(i + 1)))

  const res = await get('/api/stations/search?limit=5&offset=10')
  const body = await res.json()

  assert.equal(body.items.length, 5)
  assert.equal(body.hasMore, false)

  const params = new URL(requestedUrl).searchParams
  assert.equal(params.get('limit'), '6')
  assert.equal(params.get('offset'), '10')
})

test('los países se deduplican por nombre y se ordenan por emisoras', async () => {
  mockCatalog([
    { name: 'Spain', iso_3166_1: 'ES', stationcount: '10' },
    { name: 'Spain', iso_3166_1: 'ES-2', stationcount: '50' },
    { name: 'France', iso_3166_1: 'FR', stationcount: '100' },
    { name: null, iso_3166_1: 'XX', stationcount: '999' },
  ])

  const res = await get('/api/stations/countries')
  assert.equal(res.status, 200)

  const { items } = await res.json()
  assert.deepEqual(
    items.map((c) => [c.name, c.stationcount]),
    [
      ['France', 100],
      ['Spain', 50],
    ],
  )

  // Segunda llamada: responde la caché sin volver a Radio Browser.
  requestedUrl = undefined
  const cached = await get('/api/stations/countries')
  assert.equal(cached.headers.get('cache-control'), 'public, max-age=3600')
  assert.equal(requestedUrl, undefined)
  assert.deepEqual(await cached.json(), { items })
})

test('el orden se aplica en el catálogo y fuera de la lista blanca cae a votos', async () => {
  mockCatalog([])

  await get('/api/stations/search?order=name')
  let params = new URL(requestedUrl).searchParams
  assert.equal(params.get('order'), 'name')
  assert.equal(params.get('reverse'), 'false')
  // Radio Browser filtra las caídas en origen: los offset no se desplazan.
  assert.equal(params.get('hidebroken'), 'true')

  await get('/api/stations/search?order=inventado')
  params = new URL(requestedUrl).searchParams
  assert.equal(params.get('order'), 'votes')
  assert.equal(params.get('reverse'), 'true')
})

test('una emisora sin url_resolved se reproduce con url', async () => {
  mockCatalog([
    { ...station(1), url_resolved: '', url: 'http://example.com/fallback' },
  ])

  const res = await get('/api/stations/search')
  const body = await res.json()

  assert.equal(body.items.length, 1)
  assert.equal(body.items[0].url, 'http://example.com/fallback')
})
