import { useState } from 'react'
import { useRadio } from '../context/radio-context'
import logo from '../assets/logo-radio.png'
import type { Station } from '../services/api'
import { getProxyImageUrl } from '../services/api'
import { PauseIcon, PlayIcon } from './icons'

interface StationRowProps {
  station: Station
}

/**
 * Una fila del catálogo. Densa, sin tarjeta: la imagen ocupa una ranura fija
 * de 48 px y el texto manda. La única acción de la fila es reproducir.
 */
export default function StationRow({ station }: StationRowProps) {
  const [imgError, setImgError] = useState(false)
  const { currentStation, streamState, play } = useRadio()

  const isActive = currentStation?.id === station.id
  const isPlaying = isActive && streamState === 'playing'
  const isConnecting = isActive && streamState === 'connecting'
  const isError = isActive && streamState === 'error'

  const tags = station.tags
    ? station.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2)
    : []
  const meta = [station.country || station.language || 'Internacional', ...tags]
    .filter(Boolean)
    .join(' · ')

  const stateLabel = isPlaying
    ? 'En directo'
    : isConnecting
      ? 'Conectando'
      : isError
        ? 'Señal perdida'
        : 'En pausa'

  return (
    <li className="flex items-center gap-3 border-b border-rule py-3 transition-colors hover:bg-surface">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-raised">
        {station.favicon && !imgError ? (
          <img
            src={getProxyImageUrl(station.favicon)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <img src={logo} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-section font-semibold text-ink" title={station.name}>
          {station.name}
        </p>
        <p className="truncate text-small text-muted">
          {isActive && (
            <span className={isError ? 'text-negative' : 'text-accent'}>{stateLabel} · </span>
          )}
          {meta}
        </p>
      </div>

      <span className="w-12 shrink-0 text-right text-small tabular-nums text-faint">
        {station.votes > 0 ? station.votes : '—'}
      </span>

      <button
        type="button"
        onClick={() => play(station)}
        aria-label={isPlaying ? `Pausar ${station.name}` : `Reproducir ${station.name}`}
        className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
          isActive
            ? 'border-ink text-ink'
            : 'border-control text-muted hover:border-ink hover:text-ink'
        }`}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    </li>
  )
}
