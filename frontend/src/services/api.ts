const API_BASE = 'http://localhost:5000/api'

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
}

/* ── Stations ──────────────────────────────────────────── */

export async function searchStations(filters: SearchFilters = {}): Promise<Station[]> {
  const params = new URLSearchParams()
  if (filters.name) params.set('name', filters.name)
  if (filters.country) params.set('country', filters.country)
  if (filters.language) params.set('language', filters.language)
  if (filters.tag) params.set('tag', filters.tag)

  const qs = params.toString()
  const url = qs ? `${API_BASE}/stations/search?${qs}` : `${API_BASE}/stations/search`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`)
  }
  return res.json()
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
