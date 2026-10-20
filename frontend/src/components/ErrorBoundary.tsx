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
          className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-900 px-6 text-center"
        >
          <img src={logo} alt="" className="h-16 w-16 rounded-xl object-cover" />
          <div className="max-w-sm">
            <h1 className="text-lg font-medium text-white">La aplicación encontró un problema</h1>
            <p className="mt-1 text-sm text-slate-400">
              Tu sesión y tus favoritos siguen guardados. Recarga para continuar donde lo dejaste.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200"
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
