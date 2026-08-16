import { useState } from 'react'
import logo from '../assets/logo-radio.png'
import type { SearchFilters } from '../services/api'

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void
  loading: boolean
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [language, setLanguage] = useState('')
  const [tag, setTag] = useState('')

  const hasFilters = !!(country || language || tag)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSearch({
      name: name.trim() || undefined,
      country: country.trim() || undefined,
      language: language.trim() || undefined,
      tag: tag.trim() || undefined,
    })
    document.activeElement && 'blur' in document.activeElement && (document.activeElement as HTMLElement).blur()
  }

  function handleClear() {
    setName('')
    setCountry('')
    setLanguage('')
    setTag('')
    onSearch({})
  }

  const selectClass =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3">
          <img src={logo} alt="RadioMetro" className="w-8 h-8 object-contain flex-shrink-0 md:hidden" style={{ imageRendering: 'pixelated' }} />
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Buscar emisoras..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-4 text-base text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 md:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="País" className={selectClass + ' md:w-40'}>
            <option value="">🌍 País</option>
            <option value="Argentina">Argentina</option>
            <option value="Spain">España</option>
            <option value="Mexico">México</option>
            <option value="Colombia">Colombia</option>
            <option value="Chile">Chile</option>
            <option value="United States">Estados Unidos</option>
            <option value="United Kingdom">Reino Unido</option>
            <option value="Brazil">Brasil</option>
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Idioma" className={selectClass + ' md:w-40'}>
            <option value="">🗣️ Idioma</option>
            <option value="spanish">Español</option>
            <option value="english">Inglés</option>
            <option value="portuguese">Portugués</option>
            <option value="french">Francés</option>
            <option value="german">Alemán</option>
            <option value="italian">Italiano</option>
          </select>
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Género" className={selectClass + ' md:w-40'}>
            <option value="">🎵 Género</option>
            <option value="rock">Rock</option>
            <option value="pop">Pop</option>
            <option value="jazz">Jazz</option>
            <option value="classical">Clásica</option>
            <option value="electronic">Electrónica</option>
            <option value="news">Noticias</option>
            <option value="sport">Deportes</option>
            <option value="talk">Charlas</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="cursor-pointer rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </form>
    </header>
  )
}