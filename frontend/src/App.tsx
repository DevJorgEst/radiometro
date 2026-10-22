import { useState, useEffect, useRef, useCallback } from 'react'
import { useRadio } from './context/radio-context'
import Layout from './components/Layout'
import Auth from './views/Auth'
import SearchBar from './components/SearchBar'
import FilterBar, { type SortOrder } from './components/FilterBar'
import StationRow from './components/StationRow'
import Favorites from './views/Favorites'
import GuestFavoriteModal from './components/GuestFavoriteModal'
import { searchStations, getCountries } from './services/api'
import { validateToken } from './services/auth'
import type { Station, SearchFilters, Country } from './services/api'
import { LogOutIcon, RadioIcon, UserIcon } from './components/icons'
import logo from './assets/logo-radio.png'

type View = 'home' | 'favorites' | 'auth'

const PAGE_SIZE = 30

const TABS: { view: Exclude<View, 'auth'>; label: string }[] = [
  { view: 'home', label: 'Emisoras' },
  { view: 'favorites', label: 'Favoritos' },
]

function StationSkeleton() {
  return (
    <li className="flex items-center gap-3 border-b border-rule py-3" aria-hidden="true">
      <span className="h-12 w-12 shrink-0 rounded-lg bg-surface" />
      <span className="min-w-0 flex-1">
        <span className="block h-4 w-2/3 rounded-sm bg-surface" />
        <span className="mt-2 block h-3 w-1/3 rounded-sm bg-surface" />
      </span>
      <span className="h-4 w-8 rounded-sm bg-surface" />
      <span className="h-11 w-11 shrink-0 rounded-full border border-line" />
    </li>
  )
}

function App() {
  const { clearAll, setCurrentUser, fetchFavorites } = useRadio()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [view, setView] = useState<View>('home')
  const [query, setQuery] = useState('')
  const [stations, setStations] = useState<Station[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [sort, setSort] = useState<SortOrder>('votes')
  const [countries, setCountries] = useState<Country[]>([])

  const isAuthenticated = !!token
  // Controller de la última petición: con peticiones concurrentes, la
  // respuesta más vieja podía llegar la última. "Última petición gana".
  const searchAbortRef = useRef<AbortController | null>(null)
  const lastSearchRef = useRef<SearchFilters | null>(null)

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

  /**
   * Una sola puerta de entrada a los datos: búsqueda y paginación pasan por
   * aquí, con el mismo AbortController y el mismo criterio de "última gana".
   */
  const runSearch = useCallback(
    async (nextFilters: SearchFilters, append = false, order: SortOrder = sort) => {
      searchAbortRef.current?.abort()
      const controller = new AbortController()
      searchAbortRef.current = controller

      lastSearchRef.current = nextFilters
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      try {
        const result = await searchStations(
          {
            ...nextFilters,
            // Orden en el servidor: si solo se ordenara la página cargada,
            // "Cargar más" reiniciaría el orden a mitad de lista.
            order,
            limit: PAGE_SIZE,
            offset: append ? stations.length : 0,
          },
          controller.signal,
        )
        if (searchAbortRef.current !== controller) return
        setStations(prev => (append ? [...prev, ...result.items] : result.items))
        setHasMore(result.hasMore)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        if (searchAbortRef.current !== controller) return
        setError(
          err instanceof Error && /^Error \d/.test(err.message)
            ? err.message
            : 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
        )
        if (!append) setStations([])
      } finally {
        if (searchAbortRef.current === controller) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [stations.length, sort],
  )

  // Carga inicial del catálogo: una visita sin búsqueda ya tiene qué escuchar.
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true
    runSearch({}, false)
  }, [runSearch])

  // El vocabulario de países viene del propio catálogo: con nombres
  // inventados, buscar por país devolvería cero sin explicación.
  useEffect(() => {
    const controller = new AbortController()
    getCountries(controller.signal)
      .then(setCountries)
      .catch(() => setCountries([]))
    return () => controller.abort()
  }, [])

  // Última validación de sesión "gana" (mismo patrón que la búsqueda).
  const sessionCheckRef = useRef(0)
  useEffect(() => {
    const checkId = ++sessionCheckRef.current
    if (!token) return

    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setCurrentUser(storedUser)
      fetchFavorites()
    }

    validateToken()
      .then(({ user }) => {
        if (sessionCheckRef.current !== checkId) return
        setCurrentUser(user.username)
        fetchFavorites()
      })
      .catch(() => {
        if (sessionCheckRef.current !== checkId) return
        clearAll()
        localStorage.removeItem('token')
        setToken(null)
      })
  }, [token, setCurrentUser, fetchFavorites, clearAll])

  function searchWith(nextFilters: SearchFilters) {
    // Buscar siempre lleva al catálogo: desde Favoritos, el resultado no se
    // vería si la vista no cambiara.
    setView('home')
    runSearch({ ...nextFilters, name: query.trim() || undefined })
  }

  function handleFilterChange(patch: Partial<SearchFilters>) {
    const next = { ...filters, ...patch }
    setFilters(next)
    searchWith(next)
  }

  function handleClearFilters() {
    setFilters({})
    searchWith({})
  }

  function handleClearAll() {
    setQuery('')
    setFilters({})
    runSearch({})
  }

  function handleSortChange(next: SortOrder) {
    setSort(next)
    runSearch(lastSearchRef.current ?? {}, false, next)
  }

  function handleRetry() {
    runSearch(lastSearchRef.current ?? {})
  }

  function handleLoadMore() {
    runSearch(lastSearchRef.current ?? {}, true)
  }

  if (!isAuthenticated && view === 'auth') {
    return <Auth onLoginSuccess={handleLoginSuccess} onBackToHome={() => setView('home')} />
  }

  const active = lastSearchRef.current
  const hasActiveSearch = Boolean(
    active?.name || active?.country || active?.language || active?.tag,
  )
  const activeName = active?.name

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
        <header className="border-b border-line bg-ground">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 md:h-16 md:flex-row md:items-center md:gap-6 md:px-6 md:py-0">
            <div className="flex items-center justify-between md:hidden">
              <div className="flex items-center gap-2">
                <img
                  src={logo}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="text-section font-semibold text-ink">Radiometro</span>
              </div>
              <button
                type="button"
                onClick={() => (isAuthenticated ? handleLogout() : setView('auth'))}
                className="flex h-11 items-center gap-2 rounded-control px-2 text-body text-muted transition-colors hover:text-ink"
                aria-label={isAuthenticated ? 'Cerrar sesión' : 'Iniciar sesión'}
              >
                {isAuthenticated ? <LogOutIcon size={16} /> : <UserIcon size={16} />}
                {isAuthenticated ? 'Salir' : 'Entrar'}
              </button>
            </div>
            <div className="w-full md:max-w-xl">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={() => searchWith(filters)}
                loading={loading}
              />
            </div>
          </div>

          <nav aria-label="Secciones" className="-mb-px mx-auto flex w-full max-w-5xl gap-5 px-4 md:hidden">
            {TABS.map(tab => {
              const isActive = view === tab.view
              return (
                <button
                  key={tab.view}
                  type="button"
                  onClick={() => setView(tab.view)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-11 items-center border-b-2 text-body transition-colors ${
                    isActive
                      ? 'border-ink text-ink'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </header>

        {view === 'favorites' ? (
          <Favorites onExplore={() => setView('home')} />
        ) : (
          <section className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="text-title font-semibold text-ink">Emisoras</h1>
              {!loading && !error && stations.length > 0 && (
                <p className="text-small text-faint">
                  {stations.length}{hasMore ? '+' : ''}{' '}
                  {stations.length === 1 && !hasMore ? 'emisora' : 'emisoras'} · por{' '}
                  {sort === 'votes' ? 'votos' : 'nombre'}
                </p>
              )}
            </div>

            <div className="mt-3">
              <FilterBar
                filters={filters}
                countries={countries}
                sort={sort}
                onFilterChange={handleFilterChange}
                onSortChange={handleSortChange}
                onClear={handleClearFilters}
              />
            </div>

            {loading ? (
              <div role="status" aria-busy="true">
                <span className="sr-only">Buscando emisoras…</span>
                <ul className="mt-6" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => <StationSkeleton key={i} />)}
                </ul>
              </div>
            ) : error && stations.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <p role="alert" className="max-w-sm text-body text-negative">{error}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="cursor-pointer rounded-control bg-ink px-5 py-2 text-body font-medium text-ground transition-colors hover:bg-muted"
                >
                  Reintentar
                </button>
              </div>
            ) : stations.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <span className="text-faint"><RadioIcon size={28} /></span>
                <div>
                  <p className="text-section font-medium text-ink">
                    {hasActiveSearch ? 'Sin resultados' : 'No hay emisoras disponibles'}
                  </p>
                  <p className="mt-1 max-w-sm text-body text-muted">
                    {hasActiveSearch
                      ? activeName
                        ? `No encontramos emisoras para «${activeName}».`
                        : 'Ninguna emisora coincide con estos filtros.'
                      : 'El catálogo no ha devuelto emisoras. Inténtalo de nuevo en un momento.'}
                  </p>
                </div>
                {hasActiveSearch && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="cursor-pointer rounded-control border border-control px-5 py-2 text-body text-ink transition-colors hover:border-muted"
                  >
                    Limpiar búsqueda y filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="mt-6 flex items-center gap-3 border-b border-line pb-2 text-small text-faint">
                  <span className="min-w-0 flex-1 pl-[60px]">Emisora</span>
                  <span className="w-12 text-right">Votos</span>
                  <span className="w-11" aria-hidden="true" />
                </div>
                <ul>
                  {stations.map(station => (
                    <StationRow key={station.id} station={station} />
                  ))}
                </ul>

                {error && (
                  <div className="mt-5 flex flex-col items-center gap-3 text-center">
                    <p role="alert" className="text-body text-negative">{error}</p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="cursor-pointer rounded-control bg-ink px-5 py-2 text-body font-medium text-ground transition-colors hover:bg-muted"
                    >
                      Reintentar
                    </button>
                  </div>
                )}

                {hasMore && !error && (
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="cursor-pointer rounded-control border border-control px-5 py-2 text-body text-ink transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loadingMore ? 'Cargando…' : 'Cargar más'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </Layout>
    </>
  )
}

export default App
