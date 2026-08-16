import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchStations } from './api'

const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = originalFetch
})

describe('searchStations', () => {
  it('llama a /stations/search sin filtros', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    globalThis.fetch = mockFetch

    await searchStations({})

    const url = mockFetch.mock.calls[0][0]
    expect(url).toBe('http://localhost:5000/api/stations/search')
  })

  it('incluye los filtros en la query string', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    globalThis.fetch = mockFetch

    await searchStations({ name: 'rock', country: 'Spain', language: 'spanish', tag: 'jazz' })

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('name=rock')
    expect(url).toContain('country=Spain')
    expect(url).toContain('language=spanish')
    expect(url).toContain('tag=jazz')
  })

  it('devuelve las emisoras recibidas de la API', async () => {
    const stations = [{ id: 'st-1', name: 'Radio Test' }]
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => stations,
    })

    const result = await searchStations({ name: 'test' })
    expect(result).toEqual(stations)
  })

  it('lanza error cuando la API responde con fallo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(searchStations({})).rejects.toThrow('Error 500: Internal Server Error')
  })
})