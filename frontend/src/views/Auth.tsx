import { useState, type FormEvent } from 'react'
import { login, register } from '../services/auth'
import logo from '../assets/logo-radio.png'

interface AuthProps {
  onLoginSuccess: (token: string, username: string) => void
  onBackToHome?: () => void
}

export default function Auth({ onLoginSuccess, onBackToHome }: AuthProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Completa todos los campos')
      return
    }

    if (isRegisterMode && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)
    try {
      const fn = isRegisterMode ? register : login
      const res = await fn(username.trim(), password)
      onLoginSuccess(res.token, res.user.username)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ground p-4 text-ink">
      <div className="relative w-full max-w-md rounded-card border border-line bg-surface p-8">
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            className="absolute right-4 top-4 cursor-pointer rounded-control px-2 py-1 text-body text-muted transition-colors hover:text-ink"
          >
            Volver
          </button>
        )}

        <div className="mb-8 flex flex-col items-center">
          <img
            src={logo}
            alt=""
            width={56}
            height={56}
            className="mb-4 h-14 w-14 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          <h1 className="text-title font-semibold text-ink">Radiometro</h1>
          <p className="mt-1 text-body text-muted">
            {isRegisterMode ? 'Crea tu cuenta' : 'Inicia sesión'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-small font-medium text-muted">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Usuario"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={error ? true : undefined}
              className="w-full rounded-control border border-line bg-ground p-3 text-[16px] text-ink placeholder:text-faint transition-colors hover:border-control md:text-body"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-small font-medium text-muted">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Contraseña"
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              className="w-full rounded-control border border-line bg-ground p-3 text-[16px] text-ink placeholder:text-faint transition-colors hover:border-control md:text-body"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-control bg-negative/10 px-3 py-2 text-center text-body text-negative">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-control bg-ink px-4 py-3 text-body font-medium text-ground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Cargando…' : isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setIsRegisterMode(!isRegisterMode); setError('') }}
          className="mt-6 w-full cursor-pointer text-center text-body text-muted transition-colors hover:text-ink"
        >
          {isRegisterMode
            ? '¿Ya tienes cuenta? Inicia sesión'
            : '¿No tienes cuenta? Regístrate aquí'}
        </button>
      </div>
    </div>
  )
}
