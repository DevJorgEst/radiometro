import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, register, validateToken } from './auth'

const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = originalFetch
  localStorage.clear()
})

describe('login', () => {
  it('guarda el token y devuelve usuario', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok-123', user: { id: 1, username: 'alice' } }),
    })
    globalThis.fetch = mockFetch

    const data = await login('alice', 'password123')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      }),
    )
    expect(localStorage.getItem('token')).toBe('tok-123')
    expect(data.user.username).toBe('alice')
  })

  it('lanza el error del servidor cuando falla', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Credenciales inválidas' }),
    })

    await expect(login('alice', 'mal')).rejects.toThrow('Credenciales inválidas')
  })
})

describe('register', () => {
  it('guarda el token y devuelve usuario', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok-456', user: { id: 2, username: 'bob' } }),
    })

    const data = await register('bob', 'password123')

    expect(localStorage.getItem('token')).toBe('tok-456')
    expect(data.user.username).toBe('bob')
  })
})

describe('validateToken', () => {
  it('devuelve el usuario con token válido', async () => {
    localStorage.setItem('token', 'tok-valid')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, username: 'alice' } }),
    })

    const data = await validateToken()
    expect(data.user.username).toBe('alice')
  })

  it('lanza error sin token en localStorage', async () => {
    await expect(validateToken()).rejects.toThrow('Sin sesión')
  })

  it('limpia el token inválido y lanza error', async () => {
    localStorage.setItem('token', 'tok-invalid')
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 })

    await expect(validateToken()).rejects.toThrow('Error 401')
    expect(localStorage.getItem('token')).toBeNull()
  })
})