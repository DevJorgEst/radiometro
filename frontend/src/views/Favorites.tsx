import { useRadio } from '../context/radio-context'
import StationRow from '../components/StationRow'
import { HeartIcon } from '../components/icons'

interface FavoritesProps {
  onExplore: () => void
}

export default function Favorites({ onExplore }: FavoritesProps) {
  const { favorites, favoritesError, fetchFavorites } = useRadio()

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-title font-semibold text-ink">Tus favoritos</h1>
        {!favoritesError && favorites.length > 0 && (
          <p className="text-small text-faint">
            {favorites.length} {favorites.length === 1 ? 'emisora' : 'emisoras'}
          </p>
        )}
      </div>

      {/* Un fallo de red no es "no tienes favoritas": se nombra y se ofrece
          reintentar en el mismo sitio donde estaría la lista. */}
      {favoritesError ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p role="alert" className="text-body text-negative">
            No se pudieron cargar tus favoritos
          </p>
          <p className="max-w-xs text-body text-muted">
            Revisa tu conexión e inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={() => fetchFavorites()}
            className="cursor-pointer rounded-control bg-ink px-5 py-2 text-body font-medium text-ground transition-colors hover:bg-muted"
          >
            Reintentar
          </button>
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-faint"><HeartIcon size={28} /></span>
          <div>
            <p className="text-section font-medium text-ink">Aún no tienes favoritas</p>
            <p className="mt-1 max-w-xs text-body text-muted">
              Explora el catálogo y guarda las emisoras que te gusten con el corazón
              del reproductor.
            </p>
          </div>
          <button
            type="button"
            onClick={onExplore}
            className="cursor-pointer rounded-control border border-control px-5 py-2 text-body text-ink transition-colors hover:border-muted"
          >
            Explorar emisoras
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-3 border-b border-line pb-2 text-small text-faint">
            <span className="min-w-0 flex-1 pl-[60px]">Emisora</span>
            <span className="w-12 text-right">Votos</span>
            <span className="w-11" aria-hidden="true" />
          </div>
          <ul>
            {favorites.map(station => (
              <StationRow key={station.id} station={station} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
