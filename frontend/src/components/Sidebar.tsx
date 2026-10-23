import { useRadio } from '../context/radio-context'
import logo from '../assets/logo-radio.png'
import { HeartIcon, LogOutIcon, RadioIcon, UserIcon } from './icons'

interface SidebarProps {
  currentView: string
  onNavigate: (view: string) => void
  onLogout: () => void
  isAuthenticated: boolean
  onAuthRequest: () => void
}

const navItems = [
  { view: 'home', icon: RadioIcon, label: 'Emisoras' },
  { view: 'favorites', icon: HeartIcon, label: 'Favoritos' },
]

export default function Sidebar({
  currentView,
  onNavigate,
  onLogout,
  isAuthenticated,
  onAuthRequest,
}: SidebarProps) {
  const { currentUser } = useRadio()

  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-ground px-4 py-5 md:flex">
      <div className="mb-8 flex items-center gap-2.5">
        <img
          src={logo}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
        <span className="text-section font-semibold text-ink">Radiometro</span>
      </div>

      <nav aria-label="Navegación principal" className="flex flex-col gap-1">
        {navItems.map(({ view, icon: Icon, label }) => {
          const active = currentView === view
          return (
            <button
              key={view}
              type="button"
              onClick={() => onNavigate(view)}
              aria-current={active ? 'page' : undefined}
              className={`flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-left text-body transition-colors ${
                active ? 'bg-surface text-ink' : 'text-muted hover:bg-surface hover:text-ink'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-4">
        {isAuthenticated ? (
          <>
            {currentUser && (
              <div className="mb-2 flex items-center gap-2 px-3">
                <UserIcon size={14} />
                <span className="truncate text-body text-muted">{currentUser}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-left text-body text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <LogOutIcon size={16} />
              Cerrar sesión
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onAuthRequest}
            className="flex w-full cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-left text-body text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <UserIcon size={16} />
            Iniciar sesión
          </button>
        )}
      </div>
    </aside>
  )
}
