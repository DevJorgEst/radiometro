import { SearchIcon } from './icons'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  loading: boolean
}

/**
 * El campo de búsqueda. Va en la barra superior: es lo primero que se hace
 * con la app y por eso no se esconde en un panel ni en un desplegable.
 */
export default function SearchBar({ value, onChange, onSubmit, loading }: SearchBarProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex w-full max-w-xl items-center gap-2">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar emisoras..."
          aria-label="Buscar emisoras por nombre"
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 w-full rounded-control border border-line bg-surface py-2 pl-9 pr-3 text-[16px] text-ink placeholder:text-faint transition-colors hover:border-control md:h-9 md:text-body"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="h-11 shrink-0 cursor-pointer rounded-control bg-ink px-4 text-body font-medium text-ground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 md:h-9"
      >
        {loading ? 'Buscando…' : 'Buscar'}
      </button>
    </form>
  )
}
