import { useState } from 'react'
import { useRadio } from '../context/RadioContext'
import logo from '../assets/logo-radio.png'
import type { Station } from '../services/api'

interface StationCardProps {
  station: Station
}

export default function StationCard({ station }: StationCardProps) {
  const [imgError, setImgError] = useState(false)
  const { currentStation, isPlaying, isLoading, play } = useRadio()

  const isActive = currentStation?.id === station.id
  const isThisPlaying = isActive && isPlaying
  const isThisLoading = isActive && isLoading

  const tagsArray = station.tags
    ? station.tags.split(',').map(t => t.trim()).filter(t => t.length > 0).slice(0, 3)
    : []

  function handlePlay(e?: React.MouseEvent) {
    e?.stopPropagation()
    play(station)
  }

  return (
    <div
      onClick={() => play(station)}
      className="flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-lg backdrop-blur transition-all duration-300 hover:bg-slate-900 md:flex-row"
    >
      <div className="h-48 w-full shrink-0 overflow-hidden bg-slate-700 md:h-full md:w-48">
        {station.favicon && !imgError ? (
          <img
            src={station.favicon}
            alt={station.name}
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
            onError={() => setImgError(true)}
          />
        ) : (
          <img
            src={logo}
            alt={station.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-400">
            {station.country || station.language || 'Internacional'}
          </p>
          <h3 className="mb-2 line-clamp-1 text-xl font-bold text-white">
            {station.name}
          </h3>
          <p className="mb-4 line-clamp-2 text-sm text-slate-400">
            {tagsArray.length > 0
              ? tagsArray.join(' · ')
              : station.tags || 'Sin etiquetas'}
          </p>
        </div>

        <div className="flex items-center justify-between">
          {station.votes > 0 && (
            <span className="text-xs text-slate-500">👍 {station.votes}</span>
          )}
          <button
            type="button"
            onClick={handlePlay}
            aria-label={isThisPlaying ? 'Pausar' : 'Reproducir'}
            className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full transition ${
              isActive
                ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isThisLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isThisPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
