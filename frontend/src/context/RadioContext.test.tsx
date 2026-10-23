import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider } from './ToastContext'
import ToastHost from '../components/Toast'
import { RadioProvider } from './RadioContext'
import { useRadio } from './radio-context'
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
  const {
    currentStation,
    isPlaying,
    favorites,
    playbackError,
    favoritesError,
    timeLeft,
    toggleFavorite,
    togglePlay,
    setSleepTimer,
    play,
  } = useRadio()
  return (
    <div>
      <span data-testid="current">{currentStation?.name || 'ninguna'}</span>
      <span data-testid="playing">{isPlaying ? 'true' : 'false'}</span>
      <span data-testid="favs">{favorites.length}</span>
      <span data-testid="playback-error">{playbackError ? 'true' : 'false'}</span>
      <span data-testid="favorites-error">{favoritesError ? 'true' : 'false'}</span>
      <span data-testid="time-left">{timeLeft === null ? 'null' : timeLeft}</span>
      <button onClick={() => setSleepTimer(15)}>timer-15</button>
      <button onClick={() => setSleepTimer(null)}>timer-off</button>
      <button onClick={() => toggleFavorite(station)}>fav</button>
      <button onClick={() => play(station)}>emitir</button>
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
    <ToastProvider>
      <RadioProvider>
        <Probe />
      </RadioProvider>
      <ToastHost />
    </ToastProvider>,
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

  it('un fallo en toggleFavorite no toca la lista y avisa al usuario', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    renderProbe()
    fireEvent.click(screen.getByText('fav'))

    await waitFor(() => {
      expect(
        screen.getByText('No se pudo actualizar favoritos. Revisa tu conexión e inténtalo de nuevo.'),
      ).toBeTruthy()
    })
    // El corazón no cambia: el estado solo se actualiza tras confirmar el servidor
    expect(screen.getByTestId('favs').textContent).toBe('0')
  })

  it('un fallo al cargar favoritos marca favoritesError y avisa', async () => {
    localStorage.setItem('token', 'tok')
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('favorites-error').textContent).toBe('true')
    })
    expect(screen.getByText('No se pudieron cargar tus favoritos. Revisa tu conexión.')).toBeTruthy()
  })

  it('un error del stream marca playbackError y nombra la emisora en el aviso', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => station })

    renderProbe()
    fireEvent.click(screen.getByText('emitir'))
    await waitFor(() => {
      expect(screen.getByTestId('current').textContent).toBe('Radio Uno')
    })

    // El elemento de audio ya tiene src: simula el fallo del stream
    const audio = document.querySelector('audio')!
    fireEvent(audio, new Event('error'))

    await waitFor(() => {
      expect(screen.getByTestId('playback-error').textContent).toBe('true')
    })
    expect(
      screen.getByText('Se perdió la señal de «Radio Uno». Prueba de nuevo o elige otra emisora.'),
    ).toBeTruthy()
  })

  it('un error del audio sin src (clearAll) no se toma por fallo de señal', async () => {
    renderProbe()
    const audio = document.querySelector('audio')!
    fireEvent(audio, new Event('error'))
    expect(screen.getByTestId('playback-error').textContent).toBe('false')
  })

  describe('eventos del stream', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    function playStation() {
      renderProbe()
      fireEvent.click(screen.getByText('emitir'))
      return document.querySelector('audio')!
    }

    it('un waiting durante el arranque no impide confirmar playing', () => {
      const audio = playStation()

      fireEvent(audio, new Event('play'))
      fireEvent(audio, new Event('waiting'))
      fireEvent(audio, new Event('playing'))

      expect(screen.getByTestId('playing').textContent).toBe('true')

      act(() => {
        vi.advanceTimersByTime(30000)
      })

      expect(screen.getByTestId('playing').textContent).toBe('true')
      expect(screen.getByTestId('playback-error').textContent).toBe('false')
    })

    it('un waiting durante la reproducción no pierde el estado', () => {
      const audio = playStation()
      fireEvent(audio, new Event('playing'))
      Object.defineProperty(audio, 'currentTime', { value: 10, configurable: true })

      fireEvent(audio, new Event('waiting'))

      act(() => {
        vi.advanceTimersByTime(30000)
      })

      expect(screen.getByTestId('playing').textContent).toBe('true')
      expect(screen.getByTestId('playback-error').textContent).toBe('false')
    })

    it('el timeout no falla si el audio ya está sonando', () => {
      const audio = playStation()
      Object.defineProperty(audio, 'paused', { value: false, configurable: true })
      Object.defineProperty(audio, 'currentTime', { value: 10, configurable: true })

      act(() => {
        vi.advanceTimersByTime(30000)
      })

      expect(screen.getByTestId('playing').textContent).toBe('true')
      expect(screen.getByTestId('playback-error').textContent).toBe('false')
    })

    it('sin audio real, el timeout marca error y avisa', () => {
      playStation()

      act(() => {
        vi.advanceTimersByTime(30000)
      })

      expect(screen.getByTestId('playback-error').textContent).toBe('true')
      expect(
        screen.getByText('«Radio Uno» no ha respondido. Prueba con otra emisora.'),
      ).toBeTruthy()
    })
  })

  describe('persistencia del sleep timer', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('guarda el instante de apagado, no los segundos restantes', () => {
      renderProbe()
      fireEvent.click(screen.getByText('timer-15'))

      const stored = Number(localStorage.getItem('sleepTimerEndsAt'))
      expect(stored).toBe(new Date('2026-01-01T00:00:00Z').getTime() + 15 * 60 * 1000)
    })

    it('restaura el tiempo que realmente queda tras recargar', () => {
      localStorage.setItem('sleepTimerEndsAt', String(Date.now() + 5 * 60 * 1000))

      renderProbe()

      expect(screen.getByTestId('time-left').textContent).toBe(String(5 * 60))
    })

    it('descarta y limpia un temporizador ya vencido', () => {
      localStorage.setItem('sleepTimerEndsAt', String(Date.now() - 1000))

      renderProbe()

      expect(screen.getByTestId('time-left').textContent).toBe('null')
      expect(localStorage.getItem('sleepTimerEndsAt')).toBeNull()
    })

    it('ignora un valor corrupto en localStorage', () => {
      localStorage.setItem('sleepTimerEndsAt', 'no-es-un-numero')

      renderProbe()

      expect(screen.getByTestId('time-left').textContent).toBe('null')
    })

    it('cancelar el temporizador borra el instante persistido', () => {
      renderProbe()
      fireEvent.click(screen.getByText('timer-15'))
      expect(localStorage.getItem('sleepTimerEndsAt')).not.toBeNull()

      fireEvent.click(screen.getByText('timer-off'))
      expect(localStorage.getItem('sleepTimerEndsAt')).toBeNull()
    })
  })
})
