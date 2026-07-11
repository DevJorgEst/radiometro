interface BottomNavProps {
  currentView: string
  onNavigate: (view: string) => void
}

const navItems = [
  { view: 'home', icon: '🏠', label: 'Inicio' },
  { view: 'favorites', icon: '❤️', label: 'Favoritos' },
]

export default function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <nav className="flex items-center justify-around border-t border-slate-700 bg-slate-800 p-8 md:hidden">
      {navItems.map(({ view, icon, label }) => (
        <span
          key={view}
          onClick={() => onNavigate(view)}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 text-sm transition ${
            currentView === view
              ? 'text-indigo-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-xl">{icon}</span>
          {label}
        </span>
      ))}
    </nav>
  )
}
