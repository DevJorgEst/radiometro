import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import ToastHost from './Toast'
import PlayerBar from './PlayerBar'

interface LayoutProps {
  children: ReactNode
  currentView: string
  onNavigate: (view: string) => void
  onLogout: () => void
  isAuthenticated: boolean
  onAuthRequest: () => void
  onGuestFavoriteAttempt: () => void
}

/**
 * El armazón: una columna que se desplaza, una barra lateral fija en
 * escritorio y el reproductor anclado abajo. Nada más vive aquí.
 */
export default function Layout({
  children,
  currentView,
  onNavigate,
  onLogout,
  isAuthenticated,
  onAuthRequest,
  onGuestFavoriteAttempt,
}: LayoutProps) {
  return (
    <div className="flex h-dvh overflow-hidden bg-ground text-ink">
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={isAuthenticated}
        onAuthRequest={onAuthRequest}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <main className="flex-1 pb-32 md:pb-24">{children}</main>
        <ToastHost />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 md:left-56">
        <PlayerBar onGuestFavoriteAttempt={onGuestFavoriteAttempt} />
      </div>
    </div>
  )
}
