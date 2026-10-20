import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RadioProvider } from './context/RadioContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RadioProvider>
        <App />
      </RadioProvider>
    </ErrorBoundary>
  </StrictMode>,
)
