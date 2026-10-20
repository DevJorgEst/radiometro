import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { RadioContext } from './radio-context'
import { useToast } from './toast-context'
import { getFavorites, addFavorite, removeFavorite, getProxyStreamUrl } from '../services/api'
import type { Station } from '../services/api'

export function RadioProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast()
  const [currentStation, setCurrentStation] = useState<Station | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.7)
  const [isLoading, setIsLoading] = useState(false)
  // Segundos restantes del sleep timer; null = inactivo
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [favorites, setFavorites] = useState<Station[]>([])
  const [playbackError, setPlaybackError] = useState(false)
  const [favoritesError, setFavoritesError] = useState(false)
  const [currentUser, setCurrentUserState] = useState<string | null>(
    () => localStorage.getItem('currentUser')
  )
  const audioRef = useRef<HTMLAudioElement>(null)
  // Espejo de la emisora en emisión: el listener 'error' del <audio> se
  // registra una vez y necesita el nombre de la emisora actual en el momento
  // exacto del fallo, sin depender de closures viejas.
  const stationNameRef = useRef<string | null>(null)

  const setCurrentUser = useCallback((username: string | null) => {
    setCurrentUserState(username)
    if (username) {
      localStorage.setItem('currentUser', username)
    } else {
      localStorage.removeItem('currentUser')
    }
  }, [])

  // Pausa centralizada: además de parar el audio, cancela el temporizador
  // de apagado si el usuario pausa manualmente.
  const pause = useCallback(() => {
    audioRef.current?.pause()
    setTimeLeft(null)
  }, [])

  // Switch to a new station: update src and play
  const switchStation = useCallback((station: Station) => {
    const audio = audioRef.current
    if (!audio) return
    const url = station.url_resolved || station.url
    if (!url) return

    stationNameRef.current = station.name
    setPlaybackError(false)
    audio.src = getProxyStreamUrl(url)
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
          pause()
        } else {
          // Reintento de una emisora que ya sonaba: si el stream sigue
          // caído, el evento 'error' del <audio> se encarga del aviso.
          audio.play().catch(() => {})
        }
      } else {
        setCurrentStation(station)
      }
    },
    [currentStation, isPlaying, pause],
  )

  const togglePlay = useCallback(() => {
    if (!currentStation) return
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      pause()
    } else {
      // Mismo caso que play(): el fallo llega vía evento 'error'
      audio.play().catch(() => {})
    }
  }, [currentStation, isPlaying, pause])

  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol))
    setVolumeState(v)
    if (audioRef.current) {
      audioRef.current.volume = v
    }
  }, [])

  // minutos → segundos; null → cancelar
  const setSleepTimer = useCallback((minutes: number | null) => {
    setTimeLeft(minutes !== null ? Math.round(minutes * 60) : null)
  }, [])

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await getFavorites()
      setFavorites(data)
      setFavoritesError(false)
    } catch {
      // Sin la lista no hay favoritos que mostrar: el estado de error lleva
      // el "Reintentar" en la vista; el aviso cubre al usuario que no está
      // mirando la vista de favoritos.
      setFavoritesError(true)
      notify('No se pudieron cargar tus favoritos. Revisa tu conexión.')
    }
  }, [notify])

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
      setFavoritesError(false)
    } catch {
      // El corazón no cambia (el estado solo se actualiza tras confirmar el
      // servidor); el aviso explica por qué el clic "no hizo nada".
      notify('No se pudo actualizar favoritos. Revisa tu conexión e inténtalo de nuevo.')
    }
  }, [favorites, notify])

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
      setPlaybackError(false)
    }
    const onPause = () => setIsPlaying(false)
    const onWaiting = () => setIsLoading(true)
    const onCanPlay = () => setIsLoading(false)
    const onEnded = () => setIsPlaying(false)
    const onError = () => {
      setIsPlaying(false)
      setIsLoading(false)
      // clearAll vacía el src: ese load() no es un fallo de señal
      const src = audio.getAttribute('src')
      // Cambiar de emisora aborta la carga anterior; un aborto no es un fallo
      if (audio.error && audio.error.code === MediaError.MEDIA_ERR_ABORTED) return
      if (!src) return
      setPlaybackError(true)
      // Los nombres de Radio Browser traen tabuladores/espacios de sobra
      const name = stationNameRef.current?.trim()
      notify(
        name
          ? `Se perdió la señal de «${name}». Prueba de nuevo o elige otra emisora.`
          : 'Se perdió la señal. Prueba de nuevo o elige otra emisora.',
      )
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
  }, [notify])

  // Cuenta atrás del sleep timer: resta 1 cada segundo mientras esté activo.
  // El efecto se recrea en cada tick de timeLeft para que el primer segundo
  // nunca quede acortado por un tic anterior.
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const id = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : prev))
    }, 1000)
    return () => clearInterval(id)
  }, [timeLeft])

  // Al llegar a 0: fade-out de 5 s (50 pasos de 100 ms) directamente sobre el
  // elemento de audio y, al terminar, pausa() centralizada. El estado de
  // volumen de React no se toca: solo se atenúa el elemento y se restaura.
  useEffect(() => {
    if (timeLeft !== 0) return
    const audio = audioRef.current
    if (!audio) {
      setTimeLeft(null)
      return
    }
    const originalVolume = audio.volume
    const steps = 50
    let step = 0
    const id = setInterval(() => {
      step += 1
      audio.volume = Math.max(0, originalVolume * (1 - step / steps))
      if (step >= steps) {
        clearInterval(id)
        pause() // pausa + limpia el temporizador (timeLeft → null)
        audio.volume = originalVolume
      }
    }, 100)
    // Si el usuario pausa/cancela a mitad del fade, se restaura el volumen.
    return () => {
      clearInterval(id)
      if (step < steps) audio.volume = originalVolume
    }
  }, [timeLeft, pause])

  const clearAll = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
      audio.load()
    }
    setCurrentStation(null)
    stationNameRef.current = null
    setIsPlaying(false)
    setIsLoading(false)
    setTimeLeft(null)
    setFavorites([])
    setPlaybackError(false)
    setFavoritesError(false)
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
        timeLeft,
        favorites,
        currentUser,
        playbackError,
        favoritesError,
        play,
        pause,
        togglePlay,
        setVolume,
        setSleepTimer,
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
