import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GuestFavoriteModal from './GuestFavoriteModal'

describe('GuestFavoriteModal', () => {
  it('es un diálogo modal y mueve el foco dentro', () => {
    render(
      <GuestFavoriteModal onClose={() => {}} onLogin={() => {}} onRegister={() => {}} />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(dialog)
  })

  it('Escape cierra el diálogo', () => {
    const onClose = vi.fn()
    render(<GuestFavoriteModal onClose={onClose} onLogin={() => {}} onRegister={() => {}} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('atrapa el tabulador dentro del diálogo', () => {
    render(
      <GuestFavoriteModal onClose={() => {}} onLogin={() => {}} onRegister={() => {}} />,
    )

    const last = screen.getByRole('button', { name: 'Ahora no' })
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Iniciar sesión' }))
  })
})
