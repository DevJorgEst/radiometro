import { useState } from 'react'
import { useRadio } from './context/RadioContext'
import Layout from './components/Layout'
import Auth from './views/Auth'
import SearchBar from './components/SearchBar'
import StationCard from './components/StationCard'
import Favorites from './views/Favorites'
import { searchStations } from './services/api'
import type { Station } from './services/api'

type View = 'home' | 'favorites'

function App() {
  const { clearAll, setCurrentUser, fetchFavorites } = useRadio()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [view, setView] = useState<View>('home')
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleLoginSuccess(token: string, username: string) {
    setCurrentUser(username)
    fetchFavorites()
    setToken(token)
  }

  function handleLogout() {
    clearAll()
    localStorage.removeItem('token')
    setToken(null)
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

  if (!token) {
    return <Auth onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <Layout currentView={view} onNavigate={(v) => setView(v as View)} onLogout={handleLogout}>
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
  )
}

export default App
