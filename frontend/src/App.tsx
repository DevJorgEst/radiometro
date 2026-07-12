import { useState, useEffect, useRef } from 'react'
import { useRadio } from './context/RadioContext'
import Layout from './components/Layout'
import Auth from './views/Auth'
import SearchBar from './components/SearchBar'
import StationCard from './components/StationCard'
import Favorites from './views/Favorites'
import GuestFavoriteModal from './components/GuestFavoriteModal'
import { searchStations } from './services/api'
import type { Station } from './services/api'

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

  async function handleSearch(filters: { name: string }) {
    setLoading(true)
    setError(null)
    try {
      const data = await searchStations(filters)
      setStations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar emisoras')
      setStations([])
    } finally {
      setLoading(false)
    }
  }

  const initialLoadDone = useRef(false)

  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    async function loadInitial() {
      setLoading(true)
      try {
        const data = await searchStations({})
        setStations(shuffle(data))
      } catch {
        // silently fail on initial load
      } finally {
        setLoading(false)
      }
    }
    loadInitial()
  }, [])

  if (!isAuthenticated && view === 'auth') {
    return <Auth onLoginSuccess={handleLoginSuccess} />
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
