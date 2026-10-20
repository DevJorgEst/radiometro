import { useState, useEffect, useRef } from 'react'
import { useRadio } from './context/radio-context'
import Layout from './components/Layout'
import Auth from './views/Auth'
import SearchBar from './components/SearchBar'
import StationCard from './components/StationCard'
import Favorites from './views/Favorites'
import GuestFavoriteModal from './components/GuestFavoriteModal'
import { searchStations } from './services/api'
import { validateToken } from './services/auth'
import type { Station, SearchFilters } from './services/api'

type View = 'home' | 'favorites' | 'auth'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function App() {
  const { clearAll, setCurrentUser, fetchFavorites } = useRadio()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [view, setView] = useState<View>('home')
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGuestModal, setShowGuestModal] = useState(false)
  // Controller de la última petición de búsqueda (o carga inicial): con
  // peticiones concurrentes, la respuesta más vieja podía llegar la última
  // y sobrescribir resultados más recientes. Patrón "última petición gana".
  const searchAbortRef = useRef<AbortController | null>(null)

  const isAuthenticated = !!token

  function handleLoginSuccess(token: string, username: string) {
    setCurrentUser(username)
    fetchFavorites()
    setToken(token)
    setView('home')
  }

  function handleLogout() {
    clearAll()
    localStorage.removeItem('token')
    setToken(null)
    setView('home')
  }

  async function handleSearch(filters: SearchFilters) {
    // Cancela cualquier búsqueda (o carga inicial) aún en vuelo.
    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const data = await searchStations(filters, controller.signal)
      setStations(data)
    } catch (err) {
      // Cancelación propia: no es un error y no se tocan estados.
      // (el return salta el setError/setStations; el finally está blindado abajo)
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Error al buscar emisoras')
      setStations([])
    } finally {
      // Solo apaga el spinner si esta sigue siendo la última petición:
      // una petición abortada por una más reciente no debe tocar el estado,
      // porque la nueva ya encendió el suyo.
      if (searchAbortRef.current === controller) {
        setLoading(false)
      }
    }
  }

  const initialLoadDone = useRef(false)

  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    // Mismo canal de cancelación que handleSearch: si el usuario busca antes
    // de que termine esta carga inicial, handleSearch abortará esta petición
    // y esta no alterará estados (guard por identidad de controller).
    const controller = new AbortController()
    searchAbortRef.current = controller

    async function loadInitial() {
      setLoading(true)
      try {
        const data = await searchStations({}, controller.signal)
        if (searchAbortRef.current === controller) {
          setStations(shuffle(data))
        }
      } catch (err) {
        // Cancelada por una búsqueda del usuario o fallo de red: en silencio
        if (err instanceof Error && err.name === 'AbortError') return
      } finally {
        if (searchAbortRef.current === controller) {
          setLoading(false)
        }
      }
    }
    loadInitial()
  }, [])

  // Última validación de sesión "gana" (mismo patrón que la búsqueda): si el
  // usuario cierra sesión mientras validateToken está en vuelta, la respuesta
  // tardía no debe resucitar el currentUser ya borrado. El efecto depende de
  // `token` (fuente de verdad), no de un guard por ref que lo dejaba muerto.
  const sessionCheckRef = useRef(0)

  useEffect(() => {
    // Invalida cualquier validación anterior; también se invalida al cerrar
    // sesión (token → null), que es justo cuando una respuesta tardía daña.
    const checkId = ++sessionCheckRef.current
    if (!token) return

    // Usuario optimista desde localStorage mientras se confirma el token
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setCurrentUser(storedUser)
      fetchFavorites()
    }

    validateToken()
      .then(({ user }) => {
        if (sessionCheckRef.current !== checkId) return // respuesta desactualizada
        setCurrentUser(user.username)
        fetchFavorites()
      })
      .catch(() => {
        if (sessionCheckRef.current !== checkId) return // respuesta desactualizada
        clearAll()
        localStorage.removeItem('token')
        setToken(null)
      })
  }, [token, setCurrentUser, fetchFavorites, clearAll])

  if (!isAuthenticated && view === 'auth') {
    return <Auth onLoginSuccess={handleLoginSuccess} onBackToHome={() => setView('home')} />
  }

  return (
    <>
      {showGuestModal && (
        <GuestFavoriteModal
          onClose={() => setShowGuestModal(false)}
          onLogin={() => { setShowGuestModal(false); setView('auth') }}
          onRegister={() => { setShowGuestModal(false); setView('auth') }}
        />
      )}
      <Layout
        currentView={view}
        onNavigate={(v) => setView(v as View)}
        onLogout={handleLogout}
        isAuthenticated={isAuthenticated}
        onAuthRequest={() => setView('auth')}
        onGuestFavoriteAttempt={() => setShowGuestModal(true)}
      >
        {view === 'favorites' ? (
          <Favorites />
        ) : (
          <>
            <SearchBar onSearch={handleSearch} loading={loading} />
            <section className="flex w-full flex-col gap-4 p-6">
              {loading && (
                <p className="py-12 text-center text-sm text-slate-400">Cargando...</p>
              )}

              {error && (
                <p className="py-12 text-center text-sm text-red-400">{error}</p>
              )}

              {!loading && !error && stations.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-500">
                  Busca una emisora para comenzar
                </p>
              )}

              {!loading && stations.map((station) => (
                <StationCard key={station.id} station={station} />
              ))}
            </section>
          </>
        )}
      </Layout>
    </>
  )
}

export default App
