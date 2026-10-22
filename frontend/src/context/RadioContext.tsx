import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { RadioContext, type StreamState } from './radio-context'
import { useToast } from './toast-context'
import { getFavorites, addFavorite, removeFavorite, getProxyStreamUrl } from '../services/api'
import type { Station } from '../services/api'

const SLEEP_TIMER_KEY = 'sleepTimerEndsAt'

// Un stream que no arranca no puede quedarse en "Cargando..." para siempre:
// tras este tiempo se nombra como fallo y se ofrece otra emisora.
const CONNECT_TIMEOUT_MS = 15000

// El temporizador se guarda como instante de apagado (epoch ms), no como
// segundos restantes: así el tiempo sigue corriendo mientras la pestaña está
// cerrada y al volver se restaura lo que de verdad queda, no una cuenta
// reiniciada. Un temporizador ya vencido no se restaura.
function readPersistedTimerEnd(): number | null {
  const raw = localStorage.getItem(SLEEP_TIMER_KEY)
  if (!raw) return null
  const endsAt = Number(raw)
  if (!Number.isFinite(endsAt) || endsAt <= Date.now()) {
    localStorage.removeItem(SLEEP_TIMER_KEY)
    return null
  }
  return endsAt
}

export function RadioProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast()
  const [currentStation, setCurrentStation] = useState<Station | null>(null)
  const [streamState, setStreamState] = useState<StreamState>('idle')
  const [volume, setVolumeState] = useState(0.7)
  // Segundos restantes del sleep timer; null = inactivo. Al montar se
  // reanuda el temporizador persistido con el tiempo que realmente queda.
  const [timeLeft, setTimeLeft] = useState<number | null>(() => {
    const endsAt = readPersistedTimerEnd()
    return endsAt === null ? null : Math.round((endsAt - Date.now()) / 1000)
  })
  const [favorites, setFavorites] = useState<Station[]>([])
  const [favoritesError, setFavoritesError] = useState(false)
  const [currentUser, setCurrentUserState] = useState<string | null>(
    () => localStorage.getItem('currentUser')
  )
  const audioRef = useRef<HTMLAudioElement>(null)
  // Derivados del estado del stream: una sola fuente de verdad.
  const isPlaying = streamState === 'playing'
  const isLoading = streamState === 'connecting'
  const playbackError = streamState === 'error'
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

  // Persistencia del temporizador: cada cambio de segundos restantes reescribe
  // el instante de apagado; al desactivarse o llegar a 0 se borra la clave.
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      localStorage.removeItem(SLEEP_TIMER_KEY)
      return
    }
    localStorage.setItem(SLEEP_TIMER_KEY, String(Date.now() + timeLeft * 1000))
  }, [timeLeft])

  // Switch to a new station: update src and play
  const switchStation = useCallback((station: Station) => {
    const audio = audioRef.current
    if (!audio) return
    const url = station.url_resolved || station.url
    if (!url) return

    stationNameRef.current = station.name
    // "Conectando" es un estado real: el audio todavía no ha empezado.
    setStreamState('connecting')
    audio.src = getProxyStreamUrl(url)
    audio.load()
    audio.play().catch(() => {
      // El navegador puede bloquear el arranque automático. No es un fallo de
      // señal: el transporte queda listo para que el usuario pulse.
      setStreamState((prev) => (prev === 'connecting' ? 'paused' : prev))
    })
  }, [])

  const play = useCallback(
    (station: Station) => {
      const audio = audioRef.current
      if (!audio) return

      if (currentStation?.id === station.id) {
        if (isPlaying) {
          pause()
          return
        }
        if (streamState === 'error') {
          // Reintento real: un stream caído se recarga antes de volver a
          // intentarlo, si no el <audio> seguiría con el error guardado.
          const url = station.url_resolved || station.url
          if (!url) return
          setStreamState('connecting')
          audio.src = getProxyStreamUrl(url)
          audio.load()
          audio.play().catch(() => setStreamState('paused'))
          return
        }
        audio.play().catch(() => {})
      } else {
        setCurrentStation(station)
      }
    },
    [currentStation, isPlaying, pause, streamState],
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

    // "Sonando ahora" solo existe cuando el elemento de audio ha empezado a
    // reproducir: el evento `play` es la fuente de verdad.
    const onPlay = () => setStreamState('playing')
    const onPause = () => setStreamState((prev) => (prev === 'error' ? prev : 'paused'))
    const onWaiting = () => setStreamState((prev) => (prev === 'playing' ? 'connecting' : prev))
    const onEnded = () => setStreamState('paused')
    const onError = () => {
      // clearAll vacía el src: ese load() no es un fallo de señal
      const src = audio.getAttribute('src')
      // Cambiar de emisora aborta la carga anterior; un aborto no es un fallo
      if (audio.error && audio.error.code === MediaError.MEDIA_ERR_ABORTED) return
      if (!src) return
      setStreamState('error')
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
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [notify])

  // Vigilancia de la conexión: si el audio no arranca, se dice.
  const streamStateRef = useRef(streamState)
  useEffect(() => {
    streamStateRef.current = streamState
  }, [streamState])

  useEffect(() => {
    if (streamState !== 'connecting') return
    const id = setTimeout(() => {
      if (streamStateRef.current !== 'connecting') return
      setStreamState('error')
      const name = stationNameRef.current?.trim()
      notify(
        name
          ? `«${name}» no ha respondido. Prueba con otra emisora.`
          : 'La emisión no ha respondido. Prueba con otra emisora.',
      )
    }, CONNECT_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [streamState, notify])

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
    setStreamState('idle')
    setTimeLeft(null)
    setFavorites([])
    setFavoritesError(false)
    // Al cerrar sesión el temporizador persistido también se va; cerrar la
    // pestaña, en cambio, lo conserva a propósito.
    localStorage.removeItem(SLEEP_TIMER_KEY)
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
        streamState,
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
