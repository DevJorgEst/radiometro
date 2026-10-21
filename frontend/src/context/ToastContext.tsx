import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type Toast } from './toast-context'

const DISMISS_AFTER_MS = 6000
const MAX_VISIBLE = 3

// Avisos efímeros para fallos que ocurren fuera del foco del usuario (una
// reproducción que se cae mientras mira otra cosa, una llamada que falla).
// El estado contextual (PlayerBar, Favoritos, zona de resultados) sigue siendo
// el canal principal; esto solo lo anuncia.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Espejo síncrono del estado: notify/dismiss se disparan desde callbacks de
  // eventos de audio y fetch, donde leer el estado con closure quedaría viejo.
  const toastsRef = useRef<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const sync = useCallback((list: Toast[]) => {
    toastsRef.current = list
    setToasts(list)
  }, [])

  const clearTimer = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const dismiss = useCallback(
    (id: number) => {
      clearTimer(id)
      sync(toastsRef.current.filter(t => t.id !== id))
    },
    [clearTimer, sync],
  )

  const notify = useCallback(
    (message: string) => {
      // Mismo fallo repetido (red flaca): no apilar avisos idénticos
      if (toastsRef.current.some(t => t.message === message)) return

      const id = nextId.current++
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DISMISS_AFTER_MS),
      )

      const next = [...toastsRef.current, { id, message }]
      // Cap de visibles: el más viejo sale y su timer se limpia con él
      const dropped = next.slice(0, Math.max(0, next.length - MAX_VISIBLE))
      dropped.forEach(t => clearTimer(t.id))
      sync(next.slice(-MAX_VISIBLE))
    },
    [clearTimer, dismiss, sync],
  )

  // Higiene al desmontar (sobre todo en tests): sin timers huérfanos
  useEffect(() => {
    const currentTimers = timers.current
    return () => {
      currentTimers.forEach(timer => clearTimeout(timer))
      currentTimers.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, notify, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}
