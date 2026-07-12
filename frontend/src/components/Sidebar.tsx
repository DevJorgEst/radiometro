import { useRadio } from '../context/RadioContext'
import logo from '../assets/logo-radio.png'

interface SidebarProps {
  currentView: string
  onNavigate: (view: string) => void
  onLogout: () => void
  isAuthenticated: boolean
  onAuthRequest: () => void
}

const navItems = [
  { view: 'home', icon: '🏠', label: 'Inicio' },
  { view: 'favorites', icon: '❤️', label: 'Favoritos' },
]

export default function Sidebar({ currentView, onNavigate, onLogout, isAuthenticated, onAuthRequest }: SidebarProps) {
  const { currentUser } = useRadio()

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-slate-800 p-4 md:flex">
      <div className="mb-8 flex items-center gap-2 border-b border-slate-700 pb-4">
        <img src={logo} alt="Radiometro" className="w-10 h-10 rounded-full object-cover" />
        <span className="text-lg font-semibold">Radiometro</span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ view, icon, label }) => (
          <span
            key={view}
            onClick={() => onNavigate(view)}
            className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-700 hover:text-white ${
              currentView === view
                ? 'bg-slate-700 text-indigo-400'
                : 'text-slate-300'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </span>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-700 pt-4">
        {isAuthenticated ? (
          <>
            {currentUser && (
              <div className="mb-3 flex items-center gap-2 px-3">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-slate-400">{currentUser}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-700 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
                <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
              </svg>
              Cerrar sesión
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onAuthRequest}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-700 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
            </svg>
            Iniciar sesión
          </button>
        )}
      </div>
    </aside>
  )
}
