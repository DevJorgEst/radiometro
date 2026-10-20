import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import ErrorBoundary from './ErrorBoundary'

function Bomb(): ReactNode {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza a sus hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>contenido sano</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('contenido sano')).toBeTruthy()
  })

  it('muestra el fallback con recarga cuando un hijo lanza durante el render', () => {
    // React loguea el crash capturado en desarrollo; silenciamos la salida
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('La aplicación encontró un problema')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeTruthy()
    expect(screen.queryByText('contenido sano')).toBeNull()
  })
})
