import type { CSSProperties } from 'react'
import type { StreamState } from '../context/radio-context'

interface SignalMeterProps {
  state: StreamState
}

// Alturas en la retícula del pixel-art: barras duras, sin degradados.
const BARS = [8, 12, 16, 20, 24]

/**
 * El medidor no muestra amplitud: no la tenemos. Muestra el estado del
 * stream. Es decorativo para el lector de pantalla (aria-hidden): el texto
 * de la línea de estado es quien dice la verdad.
 */
export default function SignalMeter({ state }: SignalMeterProps) {
  const lit = state === 'playing' || state === 'connecting'

  return (
    <span
      className="signal-meter inline-flex items-end gap-[2px]"
      data-state={state}
      aria-hidden="true"
    >
      {BARS.map((height, i) => {
        const isLast = i === BARS.length - 1
        const tone =
          state === 'error' && isLast
            ? 'bg-negative'
            : lit
              ? 'bg-accent'
              : 'bg-control'
        return (
          <span
            key={i}
            className={`signal-bar w-[3px] ${tone}`}
            style={{ height: `${height}px`, '--i': i } as CSSProperties}
          />
        )
      })}
    </span>
  )
}
