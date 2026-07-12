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

    if (isRegisterMode && password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres')
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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur">
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Volver al inicio"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="mb-8 text-center">
          <img src={logo} alt="" className="mx-auto mb-4 h-16 w-16 rounded-full object-cover" />
          <h1 className="text-2xl font-bold">Radiometro</h1>
          <p className="mt-1 text-sm text-slate-400">
            {isRegisterMode ? 'Crea tu cuenta' : 'Inicia sesión'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:outline-none"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:outline-none"
          />

          {error && (
            <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Cargando…' : isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setIsRegisterMode(!isRegisterMode); setError('') }}
          className="mt-6 w-full cursor-pointer text-center text-sm text-slate-400 transition hover:text-white"
        >
          {isRegisterMode
            ? '¿Ya tienes cuenta? Inicia sesión'
            : '¿No tienes cuenta? Regístrate aquí'}
        </button>
      </div>
    </div>
  )
}
