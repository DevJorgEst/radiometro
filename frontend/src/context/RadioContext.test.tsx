import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RadioProvider, useRadio } from './RadioContext'
import type { Station } from '../services/api'

const station: Station = {
  id: 'st-1',
  name: 'Radio Uno',
  url: 'http://example.com/stream',
  country: 'Spain',
  language: 'spanish',
  tags: 'rock',
  favicon: '',
  votes: 5,
}

const originalFetch = globalThis.fetch

function Probe() {
  const { currentStation, isPlaying, favorites, toggleFavorite, togglePlay } = useRadio()
  return (
    <div>
      <span data-testid="current">{currentStation?.name || 'ninguna'}</span>
      <span data-testid="playing">{isPlaying ? 'true' : 'false'}</span>
      <span data-testid="favs">{favorites.length}</span>
      <button onClick={() => toggleFavorite(station)}>fav</button>
      <button onClick={togglePlay}>play</button>
    </div>
  )
}

beforeEach(() => {
  globalThis.fetch = originalFetch
  localStorage.clear()
  // jsdom no implementa audio; stub de métodos
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  HTMLMediaElement.prototype.pause = vi.fn()
})

function renderProbe() {
  return render(
    <RadioProvider>
      <Probe />
    </RadioProvider>,
  )
}

describe('RadioContext', () => {
  it('inicia sin emisora y sin favoritos', () => {
    renderProbe()
    expect(screen.getByTestId('current').textContent).toBe('ninguna')
    expect(screen.getByTestId('favs').textContent).toBe('0')
  })

  it('toggleFavorite añade favorito vía POST cuando no existe', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => station,
    })

    renderProbe()
    fireEvent.click(screen.getByText('fav'))

    await waitFor(() => {
      expect(screen.getByTestId('favs').textContent).toBe('1')
    })
    const call = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(call[0]).toContain('/api/favorites')
    expect(call[1]?.method).toBe('POST')
  })

  it('toggleFavorite elimina favorito vía DELETE cuando existe', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...station, url_resolved: station.url }),
    })

    renderProbe()
    fireEvent.click(screen.getByText('fav'))
    await waitFor(() => {
      expect(screen.getByTestId('favs').textContent).toBe('1')
    })

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    fireEvent.click(screen.getByText('fav'))

    await waitFor(() => {
      expect(screen.getByTestId('favs').textContent).toBe('0')
    })
    expect(vi.mocked(globalThis.fetch).mock.calls[0][1]?.method).toBe('DELETE')
  })
})