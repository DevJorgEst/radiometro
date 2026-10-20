import { createContext, useContext } from 'react'

// Módulo sin componentes React: mismo patrón que radio-context.ts, para que
// Fast Refresh mantenga límites de actualización limpios en ToastContext.tsx.
export interface Toast {
  id: number
  message: string
}

export interface ToastContextValue {
  toasts: Toast[]
  /** Muestra un aviso efímero. Los mensajes ya visibles no se duplican. */
  notify: (message: string) => void
  dismiss: (id: number) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
