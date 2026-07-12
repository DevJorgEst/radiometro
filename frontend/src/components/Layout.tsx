import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
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
    <div className="flex min-h-dvh bg-slate-900 text-white">
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={isAuthenticated}
        onAuthRequest={onAuthRequest}
      />

      <div className="flex-1 w-full min-h-screen overflow-y-auto bg-slate-950">
        <main className="pb-48 md:pb-32">
          {children}
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-slate-900 border-t border-slate-800 md:left-64">
        <PlayerBar onGuestFavoriteAttempt={onGuestFavoriteAttempt} />
        <BottomNav
          currentView={currentView}
          onNavigate={onNavigate}
          onLogout={onLogout}
          isAuthenticated={isAuthenticated}
          onAuthRequest={onAuthRequest}
        />
      </div>
    </div>
  )
}
