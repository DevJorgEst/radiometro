import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ToastProvider } from './context/ToastContext'
import { RadioProvider } from './context/RadioContext'
import { useRadio } from './context/radio-context'
import App from './App'
import Auth from './views/Auth'
import FilterBar from './components/FilterBar'
import GuestFavoriteModal from './components/GuestFavoriteModal'
import PlayerBar from './components/PlayerBar'
import type { Station } from './services/api'
import { expectNoA11yViolations } from './test/a11y'

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

const realFetch = globalThis.fetch

function json(body: unknown) {
  return Promise.resolve({ ok: true, json: async () => body } as Response)
}

beforeEach(() => {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/stations/countries')) {
      return json({ items: [{ name: 'Spain', iso: 'ES', stationcount: 10 }] })
    }
    if (url.includes('/stations/search')) {
      return json({ items: [station], hasMore: false })
    }
    return json({})
  }) as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('accesibilidad', () => {
  it('el catálogo completo no tiene violaciones', async () => {
    render(
      <ToastProvider>
        <RadioProvider>
          <App />
        </RadioProvider>
      </ToastProvider>,
    )

    await screen.findByText('Radio Uno')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy()
    await expectNoA11yViolations(document.body)
  })

  it('el formulario de acceso no tiene violaciones', async () => {
    render(<Auth onLoginSuccess={vi.fn()} onBackToHome={vi.fn()} />)
    await expectNoA11yViolations(document.body)
  })

  it('el modal de invitado no tiene violaciones', async () => {
    render(
      <GuestFavoriteModal onClose={vi.fn()} onLogin={vi.fn()} onRegister={vi.fn()} />,
    )
    await expectNoA11yViolations(document.body)
  })

  it('los filtros no tienen violaciones', async () => {
    render(
      <FilterBar
        filters={{}}
        countries={[{ name: 'Spain', iso: 'ES', stationcount: 10 }]}
        sort="votes"
        onFilterChange={vi.fn()}
        onSortChange={vi.fn()}
        onClear={vi.fn()}
      />,
    )
    await expectNoA11yViolations(document.body)
  })

  it('el reproductor con emisora no tiene violaciones', async () => {
    function PlayProbe() {
      const { play } = useRadio()
      return <button onClick={() => play(station)}>emitir</button>
    }

    render(
      <ToastProvider>
        <RadioProvider>
          <PlayProbe />
          <PlayerBar onGuestFavoriteAttempt={vi.fn()} />
        </RadioProvider>
      </ToastProvider>,
    )

    fireEvent.click(screen.getByText('emitir'))
    await expectNoA11yViolations(document.body)
  })
})
