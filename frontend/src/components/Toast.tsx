import { useToast } from '../context/toast-context'

// Pila de avisos, siempre por encima de la barra fija del reproductor:
// en móvil el bloque inferior ocupa ~160px (PlayerBar + BottomNav) y en
// desktop ~80px (solo PlayerBar). z-60 > z-50 del contenedor del reproductor.
export default function ToastHost() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-[176px] right-4 left-4 z-[60] flex flex-col gap-2 md:bottom-[104px] md:left-auto md:w-80"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="toast-in pointer-events-auto flex items-start gap-3 rounded-lg border border-slate-700 border-l-2 border-l-red-400 bg-slate-800 px-4 py-3 shadow-xl shadow-black/40"
        >
          <p className="flex-1 text-sm text-slate-200">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Cerrar aviso"
            className="-m-1 shrink-0 cursor-pointer p-1 text-slate-400 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
