const RADIO_BROWSER_URL = 'https://de1.api.radio-browser.info/json/stations'
const COUNTRIES_URL = 'https://de1.api.radio-browser.info/json/countries'
const COUNTRIES_TTL_MS = 60 * 60 * 1000

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 50
// Órdenes que la interfaz ofrece. Cualquier otro valor cae al de por defecto:
// el parámetro viaja a un tercero y no se reenvía sin filtrar.
const ALLOWED_ORDERS = new Set(['votes', 'name'])

function clampInt(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.floor(n), min), max)
}

function toStation(station) {
  return {
    id: station.stationuuid,
    name: station.name.trim(),
    // `url_resolved` es la URL tras seguir redirecciones; `url` es el valor
    // original. Sin el fallback, una emisora válida con solo `url` se descarta.
    url: station.url_resolved || station.url,
    country: station.country,
    language: station.language,
    tags: station.tags,
    favicon: station.favicon,
    votes: station.votes,
  }
}

export async function searchStations(req, res) {
  try {
    const { name, country, language, tag } = req.query
    const limit = clampInt(req.query.limit, 1, MAX_LIMIT, DEFAULT_LIMIT)
    const offset = clampInt(req.query.offset, 0, 10000, 0)
    const order = ALLOWED_ORDERS.has(req.query.order) ? req.query.order : 'votes'

    const params = new URLSearchParams()
    if (name) params.set('name', name)
    if (country) params.set('country', country)
    if (language) params.set('language', language)
    if (tag) params.set('tag', tag)
    // Orden en origen: ordenar solo la página cargada daría una lista que se
    // reinicia al pulsar "Cargar más".
    params.set('order', order)
    params.set('reverse', order === 'votes' ? 'true' : 'false')
    // Radio Browser omite las emisoras caídas: al filtrar en origen, los
    // `offset` de páginas sucesivas no se desplazan.
    params.set('hidebroken', 'true')
    // Se pide uno más de los necesarios: si viene completo hay más páginas.
    params.set('limit', String(limit + 1))
    params.set('offset', String(offset))

    const url = `${RADIO_BROWSER_URL}/search?${params.toString()}`

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error(`Radio Browser error: ${response.status}`)

    let stations = await response.json()
    if (!Array.isArray(stations)) stations = []

    const filtered = stations
      .filter(station => station.name && (station.url_resolved || station.url))
      .map(toStation)

    const hasMore = filtered.length > limit

    res.json({ items: filtered.slice(0, limit), hasMore })
  } catch (err) {
    console.error('Error fetching stations:', err)
    res.status(500).json({ error: 'Error al buscar emisoras' })
  }
}

// Vocabulario real de países de Radio Browser. El filtro de la interfaz usa
// estos nombres exactos: si la lista fuera inventada, buscar por país
// devolvería cero resultados sin explicación.
//
// El catálogo cambia de mes en mes, no de minuto en minuto: una hora de caché
// evita golpear a Radio Browser en cada visita. En memoria basta con una
// instancia; si se escala, mover a Redis.
let countriesCache = { at: 0, items: [] }

export async function listCountries(req, res) {
  if (Date.now() - countriesCache.at < COUNTRIES_TTL_MS) {
    res.set('Cache-Control', 'public, max-age=3600')
    return res.json({ items: countriesCache.items })
  }

  try {
    const response = await fetch(COUNTRIES_URL, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error(`Radio Browser error: ${response.status}`)

    const raw = await response.json()
    const countries = Array.isArray(raw) ? raw : []

    // Radio Browser puede repetir un país con distinto ISO. El filtro se
    // envía por nombre, así que una sola entrada por nombre: la que más
    // emisoras aporta.
    const byName = new Map()
    for (const country of countries) {
      if (!country || !country.name) continue
      const item = {
        name: country.name,
        iso: country.iso_3166_1 || '',
        stationcount: Number(country.stationcount) || 0,
      }
      const previous = byName.get(item.name)
      if (!previous || item.stationcount > previous.stationcount) {
        byName.set(item.name, item)
      }
    }

    const items = [...byName.values()].sort(
      (a, b) => b.stationcount - a.stationcount || a.name.localeCompare(b.name),
    )

    countriesCache = { at: Date.now(), items }
    res.set('Cache-Control', 'public, max-age=3600')
    res.json({ items })
  } catch (err) {
    console.error('Error fetching countries:', err)
    res.status(500).json({ error: 'Error al obtener los países' })
  }
}
