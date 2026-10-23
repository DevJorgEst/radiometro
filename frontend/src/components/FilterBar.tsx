import type { Country, SearchFilters } from '../services/api'

export type SortOrder = 'votes' | 'name'

interface FilterBarProps {
  filters: SearchFilters
  countries: Country[]
  sort: SortOrder
  onFilterChange: (patch: Partial<SearchFilters>) => void
  onSortChange: (sort: SortOrder) => void
  onClear: () => void
}

const LANGUAGES = [
  { value: 'spanish', label: 'Español' },
  { value: 'english', label: 'Inglés' },
  { value: 'portuguese', label: 'Portugués' },
  { value: 'french', label: 'Francés' },
  { value: 'german', label: 'Alemán' },
  { value: 'italian', label: 'Italiano' },
]

const GENRES = [
  { value: 'rock', label: 'Rock' },
  { value: 'pop', label: 'Pop' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'classical', label: 'Clásica' },
  { value: 'electronic', label: 'Electrónica' },
  { value: 'news', label: 'Noticias' },
  { value: 'sport', label: 'Deportes' },
  { value: 'talk', label: 'Charlas' },
]

const selectClass =
  'h-11 min-w-0 w-full cursor-pointer rounded-control border border-line bg-surface px-3 text-body text-ink transition-colors hover:border-control md:h-9'

/**
 * Los filtros del catálogo. El país usa el vocabulario real de Radio
 * Browser (lo devuelve /api/stations/countries): con nombres inventados,
 * "United States" no encontraría "The United States Of America".
 */
export default function FilterBar({
  filters,
  countries,
  sort,
  onFilterChange,
  onSortChange,
  onClear,
}: FilterBarProps) {
  const hasFilters = !!(filters.country || filters.language || filters.tag)

  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
      <select
        value={filters.country ?? ''}
        onChange={(e) => onFilterChange({ country: e.target.value || undefined })}
        aria-label="País"
        className={`${selectClass} col-span-2 md:w-60`}
      >
        <option value="">Todos los países</option>
        {countries.map(country => (
          <option key={country.name} value={country.name}>
            {country.name}
          </option>
        ))}
      </select>

      <select
        value={filters.language ?? ''}
        onChange={(e) => onFilterChange({ language: e.target.value || undefined })}
        aria-label="Idioma"
        className={`${selectClass} md:w-40`}
      >
        <option value="">Todos los idiomas</option>
        {LANGUAGES.map(language => (
          <option key={language.value} value={language.value}>
            {language.label}
          </option>
        ))}
      </select>

      <select
        value={filters.tag ?? ''}
        onChange={(e) => onFilterChange({ tag: e.target.value || undefined })}
        aria-label="Género"
        className={`${selectClass} md:w-44`}
      >
        <option value="">Todos los géneros</option>
        {GENRES.map(genre => (
          <option key={genre.value} value={genre.value}>
            {genre.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="col-span-2 h-11 cursor-pointer rounded-control px-3 text-body text-muted transition-colors hover:text-ink md:col-span-1 md:h-9"
        >
          Limpiar filtros
        </button>
      )}

      <label className="col-span-2 flex items-center gap-2 text-small text-muted md:col-span-1 md:ml-auto">
        Orden
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOrder)}
          aria-label="Ordenar por"
          className={`${selectClass} md:w-28`}
        >
          <option value="votes">Votos</option>
          <option value="name">Nombre</option>
        </select>
      </label>
    </div>
  )
}
