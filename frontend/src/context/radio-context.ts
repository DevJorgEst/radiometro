import { createContext, useContext } from 'react'
import type { Station } from '../services/api'

// Módulo sin componentes React: aquí viven el contexto y el hook para que
// RadioContext.tsx solo exporte el componente RadioProvider y Fast Refresh
// (regla only-export-components) mantenga un límite de actualización limpio.
export interface RadioContextValue {
  currentStation: Station | null
  isPlaying: boolean
  volume: number
  isLoading: boolean
  favorites: Station[]
  currentUser: string | null
  play: (station: Station) => void
  pause: () => void
  togglePlay: () => void
  setVolume: (vol: number) => void
  toggleFavorite: (station: Station) => void
  clearAll: () => void
  setCurrentUser: (username: string | null) => void
  fetchFavorites: () => Promise<void>
}

export const RadioContext = createContext<RadioContextValue | null>(null)

export function useRadio(): RadioContextValue {
  const ctx = useContext(RadioContext)
  if (!ctx) throw new Error('useRadio must be used within RadioProvider')
  return ctx
}
