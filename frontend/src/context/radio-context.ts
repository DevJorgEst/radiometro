import { createContext, useContext } from 'react'
import type { Station } from '../services/api'

// Módulo sin componentes React: aquí viven el contexto y el hook para que
// RadioContext.tsx solo exporte el componente RadioProvider y Fast Refresh
// (regla only-export-components) mantenga un límite de actualización limpio.
/**
 * Estado del stream, nombrado como lo vive el usuario. `connecting` existe
 * porque "Cargando..." y "Sonando ahora" no son lo mismo: uno es una espera
 * con salida, el otro es audio de verdad.
 */
export type StreamState = 'idle' | 'connecting' | 'playing' | 'paused' | 'error'

export interface RadioContextValue {
  currentStation: Station | null
  isPlaying: boolean
  volume: number
  isLoading: boolean
  /** Segundos restantes del temporizador de apagado; null = inactivo */
  timeLeft: number | null
  favorites: Station[]
  currentUser: string | null
  /** Estado del stream (idle | connecting | playing | paused | error) */
  streamState: StreamState
  /** true si el último intento de reproducción falló (stream caído) */
  playbackError: boolean
  /** true si la última carga de la lista de favoritos falló */
  favoritesError: boolean
  play: (station: Station) => void
  pause: () => void
  togglePlay: () => void
  setVolume: (vol: number) => void
  /** Programa (minutos) o cancela (null) el apagado suave del reproductor */
  setSleepTimer: (minutes: number | null) => void
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
