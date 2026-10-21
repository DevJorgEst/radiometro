import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastProvider } from './context/ToastContext'
import { RadioProvider } from './context/RadioContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* ToastProvider fuera de RadioProvider: el contexto de la radio
          dispara avisos (señal perdida, favoritos) y debe consumirlos. */}
      <ToastProvider>
        <RadioProvider>
          <App />
        </RadioProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
