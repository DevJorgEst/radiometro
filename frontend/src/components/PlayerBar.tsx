import { useEffect, useRef, useState } from 'react'
import { useRadio } from '../context/radio-context'
import logo from '../assets/logo-radio.png'
import { getProxyImageUrl } from '../services/api'

interface PlayerBarProps {
  onGuestFavoriteAttempt: () => void
}

export default function PlayerBar({ onGuestFavoriteAttempt }: PlayerBarProps) {
  const [imgError, setImgError] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const timerRef = useRef<HTMLDivElement>(null)
  const {
    currentStation,
    isPlaying,
    volume,
    isLoading,
    timeLeft,
    playbackError,
    togglePlay,
    setVolume,
    setSleepTimer,
    favorites,
    toggleFavorite,
  } = useRadio()

  // Cerrar el menú del temporizador al pulsar fuera o con Escape
  useEffect(() => {
    if (!timerOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (timerRef.current && !timerRef.current.contains(e.target as Node)) {
        setTimerOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setTimerOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [timerOpen])

  // Cada emisora nueva vuelve a intentar su favicon: un favicon roto de una
  // emisora no debe "envenenar" a las siguientes (logo permanente).
  useEffect(() => {
    setImgError(false)
  }, [currentStation?.id])

  const isFav = currentStation ? favorites.some(f => f.id === currentStation.id) : false

  // Estado del stream: un fallo de reproducción se nombra en el punto donde
  // el usuario lo mira (bajo el nombre de la emisora), no solo en el aviso.
  const statusText = !currentStation
    ? 'Busca y reproduce una emisora'
    : playbackError
      ? 'Señal perdida'
      : isLoading
        ? 'Cargando...'
        : isPlaying
          ? 'Sonando ahora'
          : 'En pausa'

  // MM:SS del temporizador de apagado
  const countdownLabel =
    timeLeft !== null
      ? `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`
      : null

  function handleFavoriteClick() {
    if (!currentStation) return
    const token = localStorage.getItem('token')
    if (!token) {
      onGuestFavoriteAttempt()
      return
    }
    toggleFavorite(currentStation)
  }

  return (
    <footer className="border-t border-slate-700 bg-slate-900 px-5 py-4 min-h-[80px]">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        {/* Station info + fav button */}
        <div className="flex min-w-0 items-center gap-3">
          {currentStation && (
            <button
              type="button"
              onClick={handleFavoriteClick}
              className="shrink-0 cursor-pointer"
              aria-label={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                className={isFav ? 'text-red-500' : 'text-slate-400 hover:text-white'}
                fill={isFav ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
          <div className="w-12 h-12 shrink-0 overflow-hidden rounded-lg bg-slate-700">
            {currentStation?.favicon && !imgError ? (
              <img
                src={getProxyImageUrl(currentStation.favicon)}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <img
                src={logo}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white max-w-[180px]">
              {currentStation?.name || 'Ninguna emisora seleccionada'}
            </p>
            <p className={`truncate text-xs ${playbackError ? 'text-red-400' : 'text-slate-400'}`}>
              {statusText}
            </p>
          </div>
        </div>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={!currentStation}
          className="flex w-10 h-10 cursor-pointer items-center justify-center rounded-full bg-white text-slate-900 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          ) : isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393" />
            </svg>
          )}
        </button>

        {/* Sleep timer */}
        <div ref={timerRef} className="relative flex items-center">
          {countdownLabel && (
            <span className="mr-2 text-xs tabular-nums text-slate-300" title="El sonido se desvanecerá al terminar">
              {countdownLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => setTimerOpen(o => !o)}
            aria-label="Temporizador de apagado"
            aria-haspopup="menu"
            aria-expanded={timerOpen}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              timeLeft !== null ? 'text-green-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>

          {timerOpen && (
            <div
              role="menu"
              aria-label="Opciones del temporizador de apagado"
              className="absolute bottom-full right-0 mb-2 w-48 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl shadow-black/40"
            >
              {[15, 30, 60].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSleepTimer(minutes)
                    setTimerOpen(false)
                  }}
                  className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                >
                  {minutes} min
                </button>
              ))}
              <div className="mx-3 my-1 border-t border-slate-700" />
              <button
                type="button"
                role="menuitem"
                disabled={timeLeft === null}
                onClick={() => {
                  setSleepTimer(null)
                  setTimerOpen(false)
                }}
                className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                Cancelar temporizador
              </button>
            </div>
          )}
        </div>

        {/* Volume slider */}
        <div className="hidden items-center gap-2 md:flex">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            fill="currentColor"
            className="text-slate-300"
            viewBox="0 0 16 16"
          >
            <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z" />
            <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z" />
            <path d="M8.707 11.182A4.5 4.5 0 0 0 10.025 8a4.5 4.5 0 0 0-1.318-3.182L8 5.525A3.5 3.5 0 0 1 9.025 8 3.5 3.5 0 0 1 8 10.475zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="volume-slider h-1.5 w-24 cursor-pointer accent-green-500 rounded-lg bg-slate-700 sm:w-28"
            aria-label="Volumen"
          />
        </div>
      </div>
    </footer>
  )
}
