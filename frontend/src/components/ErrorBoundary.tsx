import { Component, type ReactNode, type ErrorInfo } from 'react'
import logo from '../assets/logo-radio.png'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Límite global de errores de render: cualquier excepción que llegue aquí en
// vez de dejar la pantalla blanca, muestra un fallback con la única salida
// útil (recargar). Fuera de RadioProvider a propósito: si el provider de la
// radio falla, también debe quedar cubierto.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // React ya loguea el crash; aquí queda el contexto de pila para diagnóstico
    console.error('ErrorBoundary capturó un error de render:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ground px-6 text-center"
        >
          <img
            src={logo}
            alt=""
            className="h-16 w-16 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="max-w-sm">
            <h1 className="text-title font-semibold text-ink">La aplicación encontró un problema</h1>
            <p className="mt-1 text-body text-muted">
              Tu sesión y tus favoritos siguen guardados. Recarga para continuar donde lo dejaste.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-control bg-ink px-5 py-2 text-body font-medium text-ground transition-colors hover:bg-muted"
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
