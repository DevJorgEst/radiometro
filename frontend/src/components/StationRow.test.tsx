import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastProvider } from '../context/ToastContext'
import { RadioProvider } from '../context/RadioContext'
import type { Station } from '../services/api'
import StationRow from './StationRow'

const station: Station = {
  id: 'st-1',
  name: 'Radio Uno',
  url: 'http://example.com/stream',
  country: 'Spain',
  language: 'spanish',
  tags: 'rock, pop',
  favicon: '',
  votes: 12,
}

function renderRow() {
  return render(
    <ToastProvider>
      <RadioProvider>
        <ul>
          <StationRow station={station} />
        </ul>
      </RadioProvider>
    </ToastProvider>,
  )
}

describe('StationRow', () => {
  it('nombra la acción con la emisora y muestra su metadata', () => {
    renderRow()

    expect(screen.getByRole('button', { name: 'Reproducir Radio Uno' })).toBeTruthy()
    expect(screen.getByText('Radio Uno')).toBeTruthy()
    expect(screen.getByText('Spain · rock · pop')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
  })

  it('al sonar la emisora cambia a pausa y muestra el estado en directo', () => {
    renderRow()

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir Radio Uno' }))
    const audio = document.querySelector('audio')!
    fireEvent(audio, new Event('play'))

    expect(screen.getByRole('button', { name: 'Pausar Radio Uno' })).toBeTruthy()
    expect(screen.getByText(/En directo/)).toBeTruthy()
  })

  it('si la señal falla, la fila lo dice', () => {
    renderRow()

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir Radio Uno' }))
    const audio = document.querySelector('audio')!
    fireEvent(audio, new Event('error'))

    expect(screen.getByText(/Señal perdida/)).toBeTruthy()
  })
})
