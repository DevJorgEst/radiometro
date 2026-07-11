import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { getFavorites, addFavorite, removeFavorite } from '../services/api'
import type { Station } from '../services/api'

interface RadioContextValue {
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

const RadioContext = createContext<RadioContextValue | null>(null)

export function RadioProvider({ children }: { children: ReactNode }) {
  const [currentStation, setCurrentStation] = useState<Station | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.7)
  const [isLoading, setIsLoading] = useState(false)
  const [favorites, setFavorites] = useState<Station[]>([])
  const [currentUser, setCurrentUserState] = useState<string | null>(
    () => localStorage.getItem('currentUser')
  )
  const audioRef = useRef<HTMLAudioElement>(null)

  const setCurrentUser = useCallback((username: string | null) => {
    setCurrentUserState(username)
    if (username) {
      localStorage.setItem('currentUser', username)
    } else {
      localStorage.removeItem('currentUser')
    }
  }, [])

  // Switch to a new station: update src and play
  const switchStation = useCallback((station: Station) => {
    const audio = audioRef.current
    if (!audio) return
    const url = station.url_resolved || station.url
    if (!url) return

    audio.src = url
    audio.load()
    audio.play().catch(() => setIsPlaying(false))
    setIsPlaying(true)
  }, [])

  const play = useCallback(
    (station: Station) => {
      const audio = audioRef.current
      if (!audio) return

      if (currentStation?.id === station.id) {
        if (isPlaying) {
          audio.pause()
        } else {
          audio.play().catch(() => {})
        }
      } else {
        setCurrentStation(station)
      }
    },
    [currentStation, isPlaying],
  )

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const togglePlay = useCallback(() => {
    if (!currentStation) return
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }, [currentStation, isPlaying])

  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol))
    setVolumeState(v)
    if (audioRef.current) {
      audioRef.current.volume = v
    }
  }, [])

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await getFavorites()
      setFavorites(data)
    } catch {
      // Silently fail — favorites are not critical
    }
  }, [])

  const toggleFavorite = useCallback(async (station: Station) => {
    const exists = favorites.some(fav => fav.id === station.id)
    try {
      if (exists) {
        await removeFavorite(station.id)
        setFavorites(prev => prev.filter(fav => fav.id !== station.id))
      } else {
        const added = await addFavorite(station)
        setFavorites(prev => [...prev, added])
      }
    } catch {
      // Silently fail
    }
  }, [favorites])

  // Load favorites on mount (page refresh)
  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchFavorites()
    }
  }, [fetchFavorites])

  // When currentStation changes → load & play new stream
  useEffect(() => {
    if (currentStation) {
      switchStation(currentStation)
    }
  }, [currentStation, switchStation])

  // Sync React state with native audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => {
      setIsPlaying(true)
      setIsLoading(false)
    }
    const onPause = () => setIsPlaying(false)
    const onWaiting = () => setIsLoading(true)
    const onCanPlay = () => setIsLoading(false)
    const onEnded = () => setIsPlaying(false)
    const onError = () => {
      setIsPlaying(false)
      setIsLoading(false)
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [])

  const clearAll = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
      audio.load()
    }
    setCurrentStation(null)
    setIsPlaying(false)
    setIsLoading(false)
    setFavorites([])
    setCurrentUser(null)
  }, [setCurrentUser])

  // Sync volume from state to element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  return (
    <RadioContext.Provider
      value={{
        currentStation,
        isPlaying,
        volume,
        isLoading,
        favorites,
        currentUser,
        play,
        pause,
        togglePlay,
        setVolume,
        toggleFavorite,
        clearAll,
        setCurrentUser,
        fetchFavorites,
      }}
    >
      <audio ref={audioRef} hidden />
      {children}
    </RadioContext.Provider>
  )
}

export function useRadio() {
  const ctx = useContext(RadioContext)
  if (!ctx) throw new Error('useRadio must be used within RadioProvider')
  return ctx
}
