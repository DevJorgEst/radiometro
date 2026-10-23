import { useEffect, useRef } from 'react'
import { HeartIcon } from './icons'

interface GuestFavoriteModalProps {
  onClose: () => void
  onLogin: () => void
  onRegister: () => void
}

export default function GuestFavoriteModal({ onClose, onLogin, onRegister }: GuestFavoriteModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Diálogo modal: foco dentro, Escape cierra y al salir el foco vuelve a
  // donde estaba. Sin esto, el teclado se queda detrás del velo.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    panel?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      )
      if (!focusables.length) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement

      if (e.shiftKey && (current === first || current === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previous?.focus()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-favorite-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center outline-none"
      >
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-raised text-muted">
          <HeartIcon size={20} />
        </span>
        <h2 id="guest-favorite-title" className="text-section font-semibold text-ink">
          Guarda tus emisoras favoritas
        </h2>
        <p className="mt-2 text-body text-muted">
          Inicia sesión o crea una cuenta para conservar tu lista.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onLogin}
            className="w-full cursor-pointer rounded-control bg-ink px-4 py-3 text-body font-medium text-ground transition-colors hover:bg-muted"
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={onRegister}
            className="w-full cursor-pointer rounded-control border border-control px-4 py-3 text-body text-ink transition-colors hover:border-muted"
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 cursor-pointer text-body text-muted transition-colors hover:text-ink"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
