import { useToast } from '../context/toast-context'

// Pila de avisos, siempre por encima de la barra fija del reproductor.
// La región aria-live existe aunque no haya avisos: si se desmontara, el
// lector de pantalla no anunciaría el primero.
export default function ToastHost() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 left-4 z-[60] flex flex-col gap-2 md:bottom-[104px] md:left-auto md:w-80"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="toast-in pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-raised px-4 py-3 shadow-xl shadow-black/40"
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-negative" aria-hidden="true" />
          <p className="flex-1 text-body text-ink">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Cerrar aviso"
            className="-m-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-ink"
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
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
