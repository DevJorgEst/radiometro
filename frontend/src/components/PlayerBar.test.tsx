import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastProvider } from '../context/ToastContext'
import { RadioProvider } from '../context/RadioContext'
import { useRadio } from '../context/radio-context'
import ToastHost from './Toast'
import type { Station } from '../services/api'
import PlayerBar from './PlayerBar'

const station: Station = {
  id: 'st-1',
  name: 'Radio Uno',
  url: 'http://example.com/stream',
  country: 'Spain',
  language: 'spanish',
  tags: 'rock',
  favicon: '',
  votes: 12,
}

function PlayProbe() {
  const { play } = useRadio()
  return <button onClick={() => play(station)}>emitir</button>
}

function renderPlayer(onGuest = vi.fn()) {
  render(
    <ToastProvider>
      <RadioProvider>
        <PlayProbe />
        <PlayerBar onGuestFavoriteAttempt={onGuest} />
      </RadioProvider>
      <ToastHost />
    </ToastProvider>,
  )
  return { onGuest }
}

describe('PlayerBar', () => {
  it('nombra el transporte y anuncia el estado de la señal', () => {
    renderPlayer()

    const transport = screen.getByRole('button', { name: 'Reproducir' })
    expect(transport).toBeDisabled()
    expect(screen.getByText('Busca y reproduce una emisora').getAttribute('aria-live')).toBe('polite')
  })

  it('solo dice "Sonando ahora" cuando el audio ha empezado', () => {
    renderPlayer()

    fireEvent.click(screen.getByText('emitir'))
    expect(screen.getByText('Cargando...')).toBeTruthy()

    const audio = document.querySelector('audio')!
    fireEvent(audio, new Event('playing'))

    expect(screen.getByText('Sonando ahora')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeTruthy()
  })

  it('un invitado que guarda una emisora recibe la invitación', () => {
    const { onGuest } = renderPlayer()

    fireEvent.click(screen.getByText('emitir'))
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Radio Uno a favoritos' }))

    expect(onGuest).toHaveBeenCalledTimes(1)
  })
})
