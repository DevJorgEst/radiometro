import { useState } from 'react'
import logo from '../assets/logo-radio.png'

interface SearchBarProps {
  onSearch: (filters: { name: string }) => void
  loading: boolean
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSearch({ name: name.trim() })
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl items-center gap-3">
        <img src={logo} alt="Radiometro" className="w-8 h-8 rounded-full object-cover md:hidden" />
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            🔍
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Buscar emisoras..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>
    </header>
  )
}
