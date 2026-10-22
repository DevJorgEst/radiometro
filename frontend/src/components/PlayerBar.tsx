import { useEffect, useRef, useState } from 'react'
import { useRadio } from '../context/radio-context'
import logo from '../assets/logo-radio.png'
import { getProxyImageUrl } from '../services/api'
import SignalMeter from './SignalMeter'
import { HeartIcon, MoonIcon, PauseIcon, PlayIcon, VolumeIcon } from './icons'

interface PlayerBarProps {
  onGuestFavoriteAttempt: () => void
}

const TIMER_OPTIONS = [15, 30, 60]

export default function PlayerBar({ onGuestFavoriteAttempt }: PlayerBarProps) {
  const [imgError, setImgError] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const timerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const {
    currentStation,
    streamState,
    volume,
    timeLeft,
    favorites,
    toggleFavorite,
    togglePlay,
    setVolume,
    setSleepTimer,
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
      if (e.key === 'Escape') {
        setTimerOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [timerOpen])

  // Al abrir el menú, el foco entra en él (y Escape lo devuelve al botón).
  useEffect(() => {
    if (!timerOpen) return
    const first = timerRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
    first?.focus()
  }, [timerOpen])

  // Cada emisora nueva vuelve a intentar su favicon: un favicon roto de una
  // emisora no debe "envenenar" a las siguientes (logo permanente).
  useEffect(() => {
    setImgError(false)
  }, [currentStation?.id])

  const isFav = currentStation ? favorites.some(f => f.id === currentStation.id) : false

  // El estado se nombra donde el usuario lo mira (bajo el nombre de la
  // emisora), no solo en el aviso.
  const statusText =
    streamState === 'idle'
      ? 'Busca y reproduce una emisora'
      : streamState === 'connecting'
        ? 'Cargando...'
        : streamState === 'playing'
          ? 'Sonando ahora'
          : streamState === 'error'
            ? 'Señal perdida'
            : 'En pausa'

  const countdownLabel =
    timeLeft !== null
      ? `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`
      : null

  // El menú del temporizador se recorre con las flechas: un `role="menu"`
  // sin navegación por teclado es un menú que no existe para quien no usa
  // ratón.
  function handleMenuKeyDown(e: React.KeyboardEvent) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(e.key)) return
    const items = Array.from(
      timerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    )
    if (!items.length) return
    e.preventDefault()
    const current = items.indexOf(document.activeElement as HTMLElement)
    let next = 0
    if (e.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % items.length
    else if (e.key === 'ArrowUp') next = current <= 0 ? items.length - 1 : current - 1
    else if (e.key === 'Home') next = 0
    else next = items.length - 1
    items[next].focus()
  }

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
    <footer className="border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 md:gap-4 md:px-6 md:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-1 md:gap-3">
          {currentStation && (
            <button
              type="button"
              onClick={handleFavoriteClick}
              aria-label={
                isFav
                  ? `Quitar ${currentStation.name} de favoritos`
                  : `Añadir ${currentStation.name} a favoritos`
              }
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-ink"
            >
              <HeartIcon filled={isFav} />
            </button>
          )}
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-raised">
            {currentStation?.favicon && !imgError ? (
              <img
                src={getProxyImageUrl(currentStation.favicon)}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <img src={logo} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-ink">
              {currentStation?.name || 'Ninguna emisora seleccionada'}
            </p>
            <p className="flex items-center gap-2 text-small">
              <span
                aria-live="polite"
                className={streamState === 'error' ? 'text-negative' : 'text-muted'}
              >
                {statusText}
              </span>
              {currentStation && <SignalMeter state={streamState} />}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={togglePlay}
          disabled={!currentStation}
          aria-label={streamState === 'playing' ? 'Pausar' : 'Reproducir'}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-ground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          {streamState === 'playing' ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {countdownLabel && (
            <span className="mr-1 text-small tabular-nums text-muted">
              {countdownLabel}
            </span>
          )}
          <div ref={timerRef} className="relative flex items-center">
            <button
              type="button"
              ref={triggerRef}
              onClick={() => setTimerOpen(o => !o)}
              aria-label="Temporizador de apagado"
              aria-haspopup="menu"
              aria-expanded={timerOpen}
              className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
                timeLeft !== null ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              <MoonIcon />
            </button>

            {timerOpen && (
              <div
                role="menu"
                aria-label="Opciones del temporizador de apagado"
                onKeyDown={handleMenuKeyDown}
                className="absolute bottom-full right-0 mb-2 w-48 overflow-hidden rounded-card border border-line bg-raised py-1 shadow-xl shadow-black/40"
              >
                {TIMER_OPTIONS.map(minutes => (
                  <button
                    key={minutes}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSleepTimer(minutes)
                      setTimerOpen(false)
                    }}
                    className="block w-full cursor-pointer px-3 py-2 text-left text-body text-ink hover:bg-surface"
                  >
                    {minutes} min
                  </button>
                ))}
                <div className="mx-3 my-1 border-t border-line" />
                <button
                  type="button"
                  role="menuitem"
                  disabled={timeLeft === null}
                  onClick={() => {
                    setSleepTimer(null)
                    setTimerOpen(false)
                  }}
                  className="block w-full cursor-pointer px-3 py-2 text-left text-body text-muted hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancelar temporizador
                </button>
              </div>
            )}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <VolumeIcon />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="volume-slider h-1 w-24 cursor-pointer rounded-full bg-raised sm:w-28"
              aria-label="Volumen"
            />
          </div>
        </div>
      </div>
    </footer>
  )
}
