import defaultLogo from '../assets/logo-radio.png'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`

// Tolerante a null/undefined/'null' (Radio Browser devuelve strings "null"
// en algunos favicons): devuelve el logo del bundler sin invocar al proxy.
export function getProxyImageUrl(url: string | null | undefined): string {
  if (!url || url === 'null') return defaultLogo
  return `${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`
}

export function getProxyStreamUrl(url: string): string {
  if (!url) return ''
  return `${API_BASE}/proxy-stream?url=${encodeURIComponent(url)}`
}

export interface Station {
  id: string
  name: string
  url: string
  url_resolved?: string
  country: string
  language: string
  tags: string
  favicon: string
  votes: number
}

export interface SearchFilters {
  name?: string
  country?: string
  language?: string
  tag?: string
  /** Orden global del catálogo; se aplica en el servidor, no a la página cargada */
  order?: 'votes' | 'name'
  /** Máximo de emisoras por página (30 por defecto) */
  limit?: number
  /** Desplazamiento para cargar más resultados */
  offset?: number
}

export interface SearchResult {
  items: Station[]
  /** true si el servidor tiene más resultados que los devueltos */
  hasMore: boolean
}

export interface Country {
  name: string
  iso: string
  stationcount: number
}

/* ── Stations ──────────────────────────────────────────── */

export async function searchStations(
  filters: SearchFilters = {},
  signal?: AbortSignal,
): Promise<SearchResult> {
  const params = new URLSearchParams()
  if (filters.name) params.set('name', filters.name)
  if (filters.country) params.set('country', filters.country)
  if (filters.language) params.set('language', filters.language)
  if (filters.tag) params.set('tag', filters.tag)
  if (filters.order) params.set('order', filters.order)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))

  const qs = params.toString()
  const url = qs ? `${API_BASE}/stations/search?${qs}` : `${API_BASE}/stations/search`

  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Vocabulario de países tal cual lo usa Radio Browser. La lista de la
 * interfaz se construye con estos nombres para que el filtro nunca devuelva
 * cero resultados por un país escrito de otra forma.
 */
export async function getCountries(signal?: AbortSignal): Promise<Country[]> {
  const res = await fetch(`${API_BASE}/stations/countries`, { signal })
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`)
  }
  const data = await res.json()
  return Array.isArray(data?.items) ? data.items : []
}

/* ── Favorites (require auth) ──────────────────────────── */

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getFavorites(): Promise<Station[]> {
  const res = await fetch(`${API_BASE}/favorites`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  })
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export async function addFavorite(station: Station): Promise<Station> {
  const res = await fetch(`${API_BASE}/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(station),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  return res.json()
}

export async function removeFavorite(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/favorites/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
}
