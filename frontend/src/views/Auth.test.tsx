import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Auth from './Auth'
import * as authService from '../services/auth'

describe('Auth', () => {
  it('muestra el modo registro y valida password >= 8', async () => {
    render(<Auth onLoginSuccess={() => {}} onBackToHome={() => {}} />)

    fireEvent.click(screen.getByText(/¿No tienes cuenta\? Regístrate aquí/i))

    fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'corta' } })
    fireEvent.click(screen.getByText('Crear cuenta'))

    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument()
    expect(screen.getByText('Crear cuenta')).toBeInTheDocument()
  })

  it('llama a login con credenciales y notifica éxito', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue({
      token: 'tok',
      user: { id: 1, username: 'alice' },
    })
    const onSuccess = vi.fn()

    render(<Auth onLoginSuccess={onSuccess} />)
    fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('Iniciar sesión'))

    await screen.findByText('Cargando…')
    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('tok', 'alice')
    })
  })

  it('muestra error si las credenciales son inválidas', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(new Error('Credenciales inválidas'))

    render(<Auth onLoginSuccess={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('Iniciar sesión'))

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()
  })
})